import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hashSync } from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';

import { User } from '../../entities/user.entity.js';
import { IRequestWithUser, UserErrorEnum } from '../../types/auth.type.js';
import { Status } from '../../types/common.type.js';
import { Provider } from '../../types/user.type.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/auth.dto.js';

const DUMMY_PASSWORD_HASH = hashSync(randomBytes(32).toString('hex'), 10);

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(User) private userRepository: Repository<User>,
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
      select: {
        password: true,
        email: true,
        id: true,
        emailVerified: true,
        role: {
          id: true,
          permissions: true,
        },
      },
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

  thirdPartyLogin(_req: IRequestWithUser, _res: Response, _provider: Provider) {
    return 'success';
  }

  async login(payload: LoginDto) {
    const user = await this.verifyUser(payload);

    const dataToken = {
      email: user.email,
      roleId: user.role?.id,
      id: user.id,
      permissions: user.role?.permissions,
    };
    return {
      access_token: this.jwtService.sign(dataToken),
    };
  }

  logout() {
    return 'oke';
  }
}
