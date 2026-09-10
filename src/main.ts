import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module.js';
import { getHttpsOptions, getLocalDomain } from './configs/common.config.js';
import { configSwagger, SWAGGER_PATH } from './configs/swagger.config.js';

async function bootstrap() {
  const httpsOptions = getHttpsOptions();
  const APP_PORT = Number(process.env.APP_PORT ?? 8080);

  const app = await NestFactory.create(AppModule, {
    httpsOptions,
  });

  const configService = app.get(ConfigService);

  app.use(helmet());
  app.use(
    `/${SWAGGER_PATH}`,
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:'],
        },
      },
    }),
  );
  app.enableCors({
    origin: configService.get<string[]>('cors.origins'),
  });
  app.setGlobalPrefix('api');

  configSwagger(app, configService);

  await app.listen(APP_PORT, '0.0.0.0', () => {
    const LOCAL_DOMAIN = httpsOptions
      ? `https://${getLocalDomain()}`
      : 'http://localhost';

    Logger.log(`API run on ${LOCAL_DOMAIN}:${APP_PORT}/api`);
    Logger.log(`API docs on ${LOCAL_DOMAIN}:${APP_PORT}/${SWAGGER_PATH}`);
  });
}
await bootstrap();
