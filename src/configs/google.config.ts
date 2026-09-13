import { ConfigType, registerAs } from '@nestjs/config';

export const googleConfig = registerAs('google', () => ({
  clientId: process.env.GOOGLE_CLIENT_ID as string,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  callbackUrl: process.env.GOOGLE_CALLBACK_URL as string,
}));

export type GoogleConfig = ConfigType<typeof googleConfig>;
