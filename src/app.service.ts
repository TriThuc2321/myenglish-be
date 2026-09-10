import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DatabaseConfig } from './configs/database.config.js';
import { GoogleConfig } from './configs/google.config.js';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {
    const dbConfig = this.configService.get<DatabaseConfig>('database');
    const ggConfig = this.configService.get<GoogleConfig>('google');
    console.log({ dbConfig, ggConfig });
  }
  getHello(): string {
    return 'Hello World!';
  }
}
