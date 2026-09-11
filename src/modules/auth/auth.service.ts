import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { IRequestWithUser } from '../../types/auth.type.js';
import { Provider } from '../../types/user.type.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/auth.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  thirdPartyLogin(req: IRequestWithUser, _res: Response, _provider: Provider) {
    return req.user;
  }

  async login(user: LoginDto) {
    const payload = { username: user.email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  logout() {
    return 'oke';
  }
}
