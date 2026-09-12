import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { Repository } from 'typeorm';

import { User } from '../../entities/user.entity.js';
import { IRequestWithUser, UserErrorEnum } from '../../types/auth.type.js';
import { Status } from '../../types/common.type.js';
import { Provider } from '../../types/user.type.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/auth.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  private comparePasswords(password: string, hashedPassword: string) {
    return hashedPassword
      ? compare(password, hashedPassword)
      : Promise.resolve(false);
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

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (!user.emailVerified) {
      throw new HttpException(
        {
          message: 'Email not verified',
          code: UserErrorEnum.EMAIL_NOT_VERIFIED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const isValidPassword = await this.comparePasswords(
      password,
      user.password ?? '',
    );

    if (!isValidPassword) {
      throw new HttpException('Incorrect password', HttpStatus.BAD_REQUEST);
    }

    return user;
  }

  thirdPartyLogin(req: IRequestWithUser, _res: Response, _provider: Provider) {
    return req.user;
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
