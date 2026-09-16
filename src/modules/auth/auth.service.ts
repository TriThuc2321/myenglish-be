import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hashSync } from 'bcrypt';
import { randomBytes, randomUUID } from 'node:crypto';
import { IsNull, LessThan, Repository } from 'typeorm';

import { type JWTConfig, jwtConfig } from '../../configs/jwt.config.js';
import { RefreshToken } from '../../entities/refresh-token.entity.js';
import { Role } from '../../entities/role.entity.js';
import { User } from '../../entities/user.entity.js';
import {
  IGoogleProfile,
  IRefreshTokenPayload,
  ITokenPayload,
  PermissionAction,
  PermissionSubject,
  UserErrorEnum,
} from '../../types/auth.type.js';
import { Status } from '../../types/common.type.js';
import { SystemRoleCode } from '../roles/roles.constant.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/auth.dto.js';

const DUMMY_PASSWORD_HASH = hashSync(randomBytes(32).toString('hex'), 10);

const USER_TOKEN_SELECT = {
  password: true,
  email: true,
  id: true,
  emailVerified: true,
  role: {
    id: true,
    permissions: true,
  },
} as const;

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @Inject(jwtConfig.KEY) private readonly jwt: JWTConfig,
  ) {}

  private comparePasswords(password: string, hashedPassword: string) {
    return compare(password, hashedPassword || DUMMY_PASSWORD_HASH);
  }

  private async verifyUser({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    const user = await this.userRepository.findOne({
      where: { email, status: Status.ACTIVE },
      select: USER_TOKEN_SELECT,
      relations: {
        role: {
          permissions: true,
        },
      },
    });

    const isValidPassword = await this.comparePasswords(
      password,
      user?.password ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !isValidPassword) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    if (!user.emailVerified) {
      throw new HttpException(
        {
          message: 'Email not verified',
          code: UserErrorEnum.EMAIL_NOT_VERIFIED,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return user;
  }

  private toTokenPayload(user: User): ITokenPayload {
    return {
      email: user.email ?? '',
      roleId: user.role?.id,
      id: user.id,
      permissions: (user.role?.permissions ?? []).map(
        ({ action, subject }) => ({
          action: action as PermissionAction,
          subject: subject as PermissionSubject,
        }),
      ),
    };
  }

  private async issueTokens(user: User): Promise<IssuedTokens> {
    const jti = randomUUID();
    const refreshToken = this.jwtService.sign(
      { sub: user.id, jti } satisfies IRefreshTokenPayload,
      { secret: this.jwt.secretRefresh, expiresIn: this.jwt.refreshExpiresIn },
    );
    const { exp } = this.jwtService.decode<{ exp: number }>(refreshToken);
    const refreshTokenExpiresAt = new Date(exp * 1000);

    await this.refreshTokenRepository.save({
      id: jti,
      userId: user.id,
      tokenHash: RefreshToken.hash(refreshToken),
      expiresAt: refreshTokenExpiresAt,
    });
    // Opportunistic cleanup instead of a scheduler; expired rows are useless
    // for reuse detection since the signature check already rejects them.
    this.refreshTokenRepository
      .delete({
        expiresAt: LessThan(new Date()),
      })
      .catch(() => {});

    return {
      accessToken: this.jwtService.sign(this.toTokenPayload(user)),
      refreshToken,
      refreshTokenExpiresAt,
    };
  }

  private revokeAllForUser(userId: string) {
    return this.refreshTokenRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async login(payload: LoginDto) {
    const user = await this.verifyUser(payload);
    return this.issueTokens(user);
  }

  async thirdPartyLogin(profile: IGoogleProfile) {
    const { email, firstName, lastName, picture } = profile;
    if (!email) {
      throw new HttpException(
        'Google account has no email',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.userRepository.findOne({
      where: { email, status: Status.ACTIVE },
      select: USER_TOKEN_SELECT,
      relations: { role: { permissions: true } },
    });

    let newUser = user;

    if (!newUser) {
      const userRole = await this.roleRepository.findOne({
        where: { code: SystemRoleCode.USER, status: Status.ACTIVE },
        select: { id: true },
      });
      if (!userRole) {
        throw new HttpException(
          'System USER role is missing',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      newUser = await this.usersService.create({
        email,
        firstName: firstName ?? 'New user',
        lastName,
        roleId: userRole.id,
        avatar: picture,
      });
    }

    return this.issueTokens(newUser);
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }

    let payload: IRefreshTokenPayload;
    try {
      payload = this.jwtService.verify<IRefreshTokenPayload>(refreshToken, {
        secret: this.jwt.secretRefresh,
      });
    } catch {
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }

    const claim = await this.refreshTokenRepository.update(
      {
        id: payload.jti,
        userId: payload.sub,
        tokenHash: RefreshToken.hash(refreshToken),
        revokedAt: IsNull(),
      },
      { revokedAt: new Date() },
    );

    // A validly-signed token whose session is missing or already rotated out
    // means the token was replayed after theft: kill every session for the user.
    if (!claim.affected) {
      await this.revokeAllForUser(payload.sub);
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub, status: Status.ACTIVE },
      select: USER_TOKEN_SELECT,
      relations: { role: { permissions: true } },
    });
    if (!user) {
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }

    return this.issueTokens(user);
  }

  async logout(
    userId: string,
    refreshToken: string | undefined,
    allDevices = false,
  ) {
    if (allDevices || !refreshToken) {
      await this.revokeAllForUser(userId);
      return;
    }
    await this.refreshTokenRepository.update(
      {
        userId,
        tokenHash: RefreshToken.hash(refreshToken),
        revokedAt: IsNull(),
      },
      { revokedAt: new Date() },
    );
  }
}
