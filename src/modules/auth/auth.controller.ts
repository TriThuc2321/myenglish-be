import type { Request, Response } from 'express';

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
import { Throttle } from '@nestjs/throttler';

import {
  type IRequestWithGoogleUser,
  type IRequestWithUser,
} from '../../types/auth.type.js';
import {
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE,
  setRefreshTokenCookie,
} from './auth.cookie.js';
import { AuthService, type IssuedTokens } from './auth.service.js';
import { CheckPermissions } from './decorators/check-permissions.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { LoginDto, LogoutDto } from './dto/auth.dto.js';

const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private respondWithTokens(res: Response, tokens: IssuedTokens) {
    setRefreshTokenCookie(
      res,
      tokens.refreshToken,
      tokens.refreshTokenExpiresAt,
    );
    return { access_token: tokens.accessToken };
  }

  @Post('login')
  @Public()
  @Throttle(AUTH_THROTTLE)
  async login(
    @Body() signInDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respondWithTokens(res, await this.authService.login(signInDto));
  }

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Req() req: IRequestWithGoogleUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respondWithTokens(
      res,
      await this.authService.thirdPartyLogin(req.user),
    );
  }

  @Post('refresh')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({
    summary: 'Rotate the refresh token cookie and issue a new access token',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      return this.respondWithTokens(
        res,
        await this.authService.refresh(req.cookies?.[REFRESH_TOKEN_COOKIE]),
      );
    } catch (error) {
      clearRefreshTokenCookie(res);
      throw error;
    }
  }

  @Get('profile')
  @CheckPermissions()
  getProfile(@Req() req: IRequestWithUser) {
    return req.user;
  }

  @Post('logout')
  @CheckPermissions()
  @ApiOperation({ summary: 'User Logout' })
  async logout(
    @Req() req: IRequestWithUser,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: LogoutDto,
  ) {
    await this.authService.logout(
      req.user.id,
      req.cookies?.[REFRESH_TOKEN_COOKIE],
      dto.allDevices,
    );
    clearRefreshTokenCookie(res);
  }
}
