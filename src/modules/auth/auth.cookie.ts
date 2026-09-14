import type { CookieOptions, Response } from 'express';

export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const REFRESH_COOKIE_PATH = '/api/auth';

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'none',
  path: REFRESH_COOKIE_PATH,
};

export function setRefreshTokenCookie(
  res: Response,
  token: string,
  expiresAt: Date,
) {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    ...baseOptions,
    expires: expiresAt,
  });
}

export function clearRefreshTokenCookie(res: Response) {
  res.clearCookie(REFRESH_TOKEN_COOKIE, baseOptions);
}
