import type { INestApplication } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'docs';

export const configSwagger = (
  app: INestApplication,
  configService: ConfigService,
) => {
  const config = new DocumentBuilder()
    .setTitle('My English APIs')
    .setDescription('My English APIs document')
    .setVersion('1.0.0')
    .addCookieAuth(configService.get('SWAGGER_COOKIE_NAME', 'access_token'))
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
};
