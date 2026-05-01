import { Injectable } from '@nestjs/common';
import { CacheProxy } from './proxy/cache.proxy';
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
  constructor(private readonly cache: CacheProxy) {}

  async getPropertyList(
    params: PropertyListCacheParams,
  ): Promise<CacheEntry<unknown> | undefined> {
    const key = this.buildPropertyListKey(params);
    return this.cache.get<CacheEntry<unknown>>(key);
  }

  async setPropertyList(
    params: PropertyListCacheParams,
    data: unknown,
    ttlMs = DEFAULT_TTL_MS,
  ): Promise<void> {
    const key = this.buildPropertyListKey(params);
    const entry: CacheEntry<unknown> = {
      data,
      serializedAt: Date.now(),
      ttl: ttlMs,
    };

    await this.cache.set(key, entry, ttlMs);
  }

  async invalidatePropertyList(): Promise<void> {
    await this.cache.clear();
  }

  private buildPropertyListKey(params: PropertyListCacheParams): string {
    const filters: CacheKeyParams['filters'] = {};

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

    return buildCacheKey({ prefix: PROPERTY_LIST_PREFIX, filters });
  }
}
