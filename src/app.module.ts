import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { corsConfig } from './configs/cors.config.js';
import { getDbOption, databaseConfig } from './configs/database.config.js';
import { googleConfig } from './configs/google.config.js';
import { jwtConfig } from './configs/jwt.config.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtAuthGuard } from './modules/auth/guards/jwt.guard.js';
import { PermissionGuard } from './modules/auth/guards/permission.guard.js';
import { CaslModule } from './shared/casl/casl.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, googleConfig, corsConfig, jwtConfig],
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDbOption,
    }),
    AuthModule,
    CaslModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}
