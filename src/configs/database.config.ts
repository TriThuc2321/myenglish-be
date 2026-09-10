import { ConfigService, registerAs } from '@nestjs/config';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSourceOptions } from 'typeorm';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  sync: boolean;
}

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT ?? '', 10) || 5432,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  name: process.env.DATABASE_NAME,
  sync: process.env.DATABASE_SYNC === 'true',
}));

export const getDbOption = (
  configService: ConfigService,
): DataSourceOptions => {
  const { host, port, username, password, name, sync } =
    configService.get<DatabaseConfig>('database') ?? {};

  return {
    type: 'postgres',
    host,
    port,
    username,
    password,
    database: name,
    synchronize: sync,
    entities: [join(__dirname, './../entities/*.entity.{js,ts}')],
  };
};
