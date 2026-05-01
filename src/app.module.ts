import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { PropertyModule } from './property/property.module';
import { RedisModule } from './cache/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    PropertyModule,
    RedisModule,
  ],
})
export class AppModule {}
