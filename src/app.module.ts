import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import dbConfig from './configs/database.config.js';
import googleConfig from './configs/google.config.js';

@Module({
  imports: [ConfigModule.forRoot({ load: [dbConfig, googleConfig] })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
