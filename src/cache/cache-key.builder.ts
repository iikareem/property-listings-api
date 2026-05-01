export interface CacheKeyParams {
  prefix: string;
  filters: Record<string, string | number | boolean>;
}

export function buildCacheKey(params: CacheKeyParams): string {
  const parts: string[] = [params.prefix];

  const sortedKeys = Object.keys(params.filters).sort();

  for (const key of sortedKeys) {
    const value = params.filters[key];
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${key}=${value}`);
    }
  }

  return parts.join(':');
}
