import { Injectable, Logger, type LogLevel } from '@nestjs/common';
import { CacheManagerAdapter } from '../adapters/cache-manager.adapter';
import type { CacheAdapter } from '../interfaces/cache-adapter.interface';

const LOG_LEVEL: LogLevel = 'debug';

@Injectable()
export class CacheProxy implements CacheAdapter {
  private readonly logger = new Logger(CacheProxy.name);

  constructor(private readonly adapter: CacheManagerAdapter) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.timed(key, () => this.adapter.get<T>(key), 'GET');
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    return this.timed(key, () => this.adapter.set(key, value, ttl), 'SET');
  }

  async del(key: string): Promise<void> {
    return this.timed(key, () => this.adapter.del(key), 'DEL');
  }

  async clear(): Promise<void> {
    return this.timed('all', () => this.adapter.clear(), 'CLEAR');
  }

  private async timed<T>(
    key: string,
    operation: () => Promise<T>,
    action: string,
  ): Promise<T> {
    const start = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - start;

      if (action === 'GET') {
        this.logger.log(
          `Cache ${result !== undefined ? 'HIT' : 'MISS'} | key=${key} | ${duration}ms`,
          LOG_LEVEL,
        );
      } else {
        this.logger.log(
          `Cache ${action} | key=${key} | ${duration}ms`,
          LOG_LEVEL,
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Cache ${action} FAILED | key=${key} | ${duration}ms | ${message}`,
      );
      throw error;
    }
  }
}
