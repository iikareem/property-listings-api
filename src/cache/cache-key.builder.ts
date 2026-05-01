export interface CacheKeyParams {
  prefix: string;
  filters: Record<string, string | number | boolean>;
}

export function buildCacheKey(params: CacheKeyParams): string {
  const segments = [params.prefix];

  for (const key of sortedKeys(params.filters)) {
    const value = params.filters[key];

    if (isNotEmpty(value)) {
      segments.push(`${key}=${value}`);
    }
  }

  return segments.join(':');
}

function sortedKeys(filters: Record<string, unknown>): string[] {
  return Object.keys(filters).sort();
}

function isNotEmpty(value: string | number | boolean): boolean {
  return value !== undefined && value !== null && value !== '';
}
