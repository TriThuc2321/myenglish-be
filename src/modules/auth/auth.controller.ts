import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { type IRequestWithUser } from '../../types/auth.type.js';
import { Provider } from '../../types/user.type.js';
import { AuthService } from './auth.service.js';
import { CheckPermissions } from './decorators/check-permissions.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { LoginDto } from './dto/auth.dto.js';
import { JwtAuthGuard } from './guards/jwt.guard.js';
@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  async login(@Body() signInDto: LoginDto) {
    return this.authService.login(signInDto);
  }

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  googleAuthCallback(
    @Req() req: IRequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.thirdPartyLogin(req, res, Provider.GOOGLE);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @CheckPermissions()
  getProfile(@Req() req: IRequestWithUser) {
    return req.user;
  }

  @Post('logout')
  @CheckPermissions()
  @ApiOperation({ summary: 'User Logout' })
  logout() {
    return this.authService.logout();
  }
}
