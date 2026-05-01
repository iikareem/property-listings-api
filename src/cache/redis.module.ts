import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import { CacheManagerAdapter } from './adapters/cache-manager.adapter';
import { CacheProxy } from './proxy/cache.proxy';
import { RedisService } from './redis.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        stores: [
          new KeyvRedis(
            `redis://${configService.get('REDIS_HOST', 'localhost')}:${configService.get('REDIS_PORT', 6379)}`,
          ),
        ],
        ttl: configService.get<number>('CACHE_TTL', 300_000),
      }),
    }),
  ],
  providers: [CacheManagerAdapter, CacheProxy, RedisService],
  exports: [RedisService],
})
export class RedisModule {}
