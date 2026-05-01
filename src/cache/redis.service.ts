import { Injectable } from '@nestjs/common';
import { CacheProxy } from './proxy/cache.proxy';
import { CacheLock } from './cache-lock';
import { buildCacheKey, type CacheKeyParams } from './cache-key.builder';

const PROPERTY_LIST_PREFIX = 'property:list';
const DEFAULT_TTL_MS = 300_000;

export interface PropertyListCacheParams {
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  minBedrooms?: number;
  minAreaSqm?: number;
  maxAreaSqm?: number;
  isAvailable?: boolean;
  cursor?: string;
  operator?: 'AND' | 'OR';
  limit?: number;
}

interface CacheEntry<T> {
  data: T;
  serializedAt: number;
  ttl: number;
}

@Injectable()
export class RedisService {
  private readonly lock = new CacheLock();
  private readonly trackedKeys = new Set<string>();

  constructor(private readonly cache: CacheProxy) {}

  async getPropertyList<T>(
    params: PropertyListCacheParams,
    fetchFn: () => Promise<T>,
    ttlMs = DEFAULT_TTL_MS,
  ): Promise<T> {
    const key = this.buildKey(params);
    const cached = await this.cache.get<CacheEntry<T>>(key);

    if (cached) {
      return cached.data;
    }

    return this.lock.acquire(key, async () => {
      const doubleCheck = await this.cache.get<CacheEntry<T>>(key);

      if (doubleCheck) {
        return doubleCheck.data;
      }

      const data = await fetchFn();
      await this.store(key, data, ttlMs);
      this.trackedKeys.add(key);

      return data;
    });
  }

  async invalidatePropertyList(): Promise<void> {
    const keys = Array.from(this.trackedKeys);

    for (const key of keys) {
      try {
        await this.cache.del(key);
        this.trackedKeys.delete(key);
      } catch {
        continue;
      }
    }
  }

  private async store<T>(key: string, data: T, ttlMs: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      serializedAt: Date.now(),
      ttl: ttlMs,
    };

    await this.cache.set(key, entry, ttlMs);
  }

  private buildKey(params: PropertyListCacheParams): string {
    return buildCacheKey({
      prefix: PROPERTY_LIST_PREFIX,
      filters: this.toFilters(params),
    });
  }

  private toFilters(
    params: PropertyListCacheParams,
  ): CacheKeyParams['filters'] {
    const filters: Record<string, string | number | boolean> = {};

    if (params.minPrice) filters.minPrice = params.minPrice;
    if (params.maxPrice) filters.maxPrice = params.maxPrice;
    if (params.city) filters.city = params.city;
    if (params.minBedrooms) filters.minBedrooms = params.minBedrooms;
    if (params.minAreaSqm) filters.minAreaSqm = params.minAreaSqm;
    if (params.maxAreaSqm) filters.maxAreaSqm = params.maxAreaSqm;
    if (params.isAvailable !== undefined)
      filters.isAvailable = params.isAvailable;
    if (params.cursor) filters.cursor = params.cursor;
    if (params.operator) filters.operator = params.operator;
    if (params.limit) filters.limit = params.limit;

    return filters;
  }
}
