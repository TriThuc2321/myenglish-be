import { registerAs } from '@nestjs/config';

export default registerAs('google', () => ({
  host: process.env.GOOGLE_CLIENT_ID,
  port: process.env.GOOGLE_CLIENT_SECRET,
  callback: process.env.GOOGLE_CALLBACK_URL,
}));

export interface GoogleConfig {
  host: string;
  port: number;
  callback: string;
}
