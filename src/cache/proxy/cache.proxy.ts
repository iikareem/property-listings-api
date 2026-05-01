import { Injectable } from '@nestjs/common';
import type { CacheAdapter } from '../interfaces/cache-adapter.interface';
import { CacheManagerAdapter } from '../adapters/cache-manager.adapter';
import { Logger, type LogLevel } from '@nestjs/common';

const LOG_LEVEL: LogLevel = 'debug';

@Injectable()
export class CacheProxy implements CacheAdapter {
  private readonly logger: Logger;

  constructor(private readonly adapter: CacheManagerAdapter) {
    this.logger = new Logger(CacheProxy.name);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const start = Date.now();

    try {
      const result = await this.adapter.get<T>(key);
      const duration = Date.now() - start;

      this.logger.log(
        `Cache ${result !== undefined ? 'HIT' : 'MISS'} | key=${key} | ${duration}ms`,
        LOG_LEVEL,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error(
        `Cache get failed | key=${key} | ${duration}ms | error=${error}`,
      );
      throw error;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.adapter.set(key, value, ttl);
      this.logger.log(`Cache SET | key=${key}`, LOG_LEVEL);
    } catch (error) {
      this.logger.error(`Cache set failed | key=${key} | error=${error}`);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.adapter.del(key);
      this.logger.log(`Cache DEL | key=${key}`, LOG_LEVEL);
    } catch (error) {
      this.logger.error(`Cache del failed | key=${key} | error=${error}`);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.adapter.clear();
      this.logger.log('Cache CLEAR | all keys', LOG_LEVEL);
    } catch (error) {
      this.logger.error(`Cache clear failed | error=${error}`);
      throw error;
    }
  }
}
