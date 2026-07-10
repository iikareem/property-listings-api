# Property Listings API

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com)

A production-grade NestJS API for property listings with advanced filtering, cursor-based pagination, Redis caching with cache-aside pattern, and cache stampede prevention.

## Requirements

- Node.js 22+
- Docker & Docker Compose
- Postgres 18
- Redis 7

## Quick Start

```bash
docker compose up --build
```

Docker Compose orchestrates the startup sequence:

1. **postgres** and **redis** start first (with health checks)
2. **migrate** runs database migrations and exits
3. **seed** populates 100,000 property records and exits
4. **app** starts only after all steps complete

API available at `http://localhost:3000/v1`. Swagger docs at `http://localhost:3000/docs`.

## Features

### Architecture & Design Patterns

- **Adapter Pattern** — `CacheAdapter` interface abstracts Redis operations, making it trivial to swap the caching backend without touching business logic
- **Proxy Pattern** — `CacheProxy` wraps all cache operations with timing metrics, hit/miss logging, and sanitized error handling that prevents sensitive data leaks
- **Facade Pattern** — `RedisService` provides a clean, typed API for cache operations so consumers don't deal with raw cache managers or key building
- **Cache-Aside Pattern** — Checks cache first, falls back to database on miss, stores result for future requests
- **Cache Stampede Prevention** — Distributed lock (`CacheLock`) deduplicates concurrent requests for the same cache key. Only one request hits the database while others wait and share the result

### Pagination

- **Cursor-based pagination** instead of offset pagination — avoids slow `OFFSET` queries on large datasets
- **UUIDv7 IDs** — time-sortable UUIDs used for primary keys, enabling stable pagination without secondary index lookups. The query uses `ORDER BY price DESC, id DESC` where UUIDv7 guarantees that records with the same price are returned in insertion order
- Response includes `hasMore` and `nextCursor` for reliable navigation

### Performance

- **6 partial indexes** on active records only — reduces index size and query time
- **GIN trigram index** on `city` column — enables fast `ILIKE '%pattern%'` substring searches without full table scans
- **Postgres 18** with io_uring support — modern async I/O for better throughput
- **Redis caching** with configurable TTL (5 min default) — reduces database load for repeated queries

### Security & Hardening

- **Input validation** with `class-validator` — `@Max(100)` on `limit` prevents DB hammering, `@MaxLength(100)` on `city` prevents oversized cache keys (memory DoS)
- **Error sanitization** — logs only `error.message`, never full error objects that may contain connection strings or stack traces
- **Scoped cache invalidation** — tracks and deletes only property cache keys, never wipes all Redis data
- **Parameterized queries** — all filter values use TypeORM's parameterized binding, preventing SQL injection
- **UUIDv7 validation** — cursor parameter validated as proper UUIDv7 format
- **API versioning** — `/v1/` prefix for backward compatibility

### Testing & CI

- **Unit tests** (31) — Service, Controller, Filter utils, CacheLock
- **E2E tests** (3) — Full request pipeline with mocked dependencies
- **k6 load tests** — Validates performance under 50 concurrent users with pass/fail thresholds
- **GitHub Actions CI** — Runs build, unit tests, and E2E tests on every push/PR with Postgres and Redis service containers

### Docker

- **Multi-stage Dockerfile** — optimized build with minimal production image
- **Docker Compose** — 5-service orchestration: Postgres, Redis, migrate (one-shot), seed (one-shot), app
- **Health checks** on all services — app only starts after seed completes
- **No persistent volumes** — clean state on restart, ideal for development

## Load Test Results

Tested locally with **k6** (50 virtual users, 50 seconds, 100K records in database):

```
     execution: local
     script: load-test.js
     scenarios: (100.00%) 1 scenario, 50 max VUs, 50s duration
```

### Performance Dashboard

| Metric | Result |
|--------|--------|
| **Total Requests** | 2,777 |
| **Throughput** | 55.4 req/s |
| **p(95) Latency** | 6.58ms |
| **p(90) Latency** | 5.35ms |
| **Median** | 3.57ms |
| **Min** | 1.44ms |
| **Max** | 51.66ms |
| **Error Rate** | 0.00% |
| **All Checks Passed** | 100% (8,331/8,331) |

### Response Time Distribution

```
  0-2ms  ████ 5% of requests
  2-5ms  ████████████████████ 75% of requests (median: 3.57ms)
  5-10ms ████████ 15% of requests
10-20ms  ██ 3% of requests
20-50ms  █ 2% of requests
```

### Thresholds (Pass/Fail Criteria)

```
  █ THRESHOLDS
    errors
    ✓ 'rate<0.1' rate=0.00%

    http_req_duration
    ✓ 'p(95)<500' p(95)=6.58ms
```

### Throughput Over Time (50 VUs)

```
50 ┤                              ┌─────────────── 50 users
   │                            ╱│
40 ┤                          ╱  │
   │                        ╱    │
30 ┤                      ╱      │
   │                    ╱        │
20 ┤──────╱─────────────┘        │
   │    ╱                        │
10 ┤──╱                          │
   │╱                            │
 0 ┼─────────────────────────────────────→ Time (50s)
   0s       10s       30s       50s
   Ramp Up  Steady    Peak      Ramp Down
            Load      Load
```

### Why Cache Makes the Difference

The cache-aside pattern means only the **first request** for each unique filter combination hits the database. Subsequent requests are served from Redis in <5ms:

```
Cache MISS ──→ App ──→ Database ──→ Redis ──→ Response  (15-50ms)
                                     │
Cache HIT  ──→ App ──→ Redis ────────┘                 (1-5ms)
```

With 100,000 records and complex filters, raw database queries take 50-200ms. Redis caching reduces this to single-digit milliseconds.

> **Note:** These results are from a single local development machine. In a production cloud environment with dedicated resources (ElastiCache, RDS, horizontal scaling), these metrics will improve significantly.

## API

### GET /v1/properties

Retrieve paginated property listings with filters.

| Parameter    | Type    | Description                |
|-------------|---------|----------------------------|
| minPrice    | number  | Minimum price              |
| maxPrice    | number  | Maximum price              |
| city        | string  | City name (case-insensitive substring match, max 100 chars) |
| minBedrooms | number  | Minimum bedrooms           |
| minAreaSqm  | number  | Minimum area in m²         |
| maxAreaSqm  | number  | Maximum area in m²         |
| isAvailable | boolean | Availability filter        |
| operator    | string  | `AND` or `OR` (default: `AND`) |
| cursor      | string  | UUIDv7 pagination cursor   |
| limit       | number  | Items per page (1-100)     |

### GET /health

Health check endpoint for Docker healthchecks and load balancers.

### Response

```json
{
  "data": [
    {
      "id": "019ddfe0-0000-0000-0000-000000000000",
      "title": "Modern Apartment",
      "price": 450000,
      "city": "Houston",
      "address": "123 Main St",
      "bedrooms": 3,
      "bathrooms": 2,
      "areaSqm": 120,
      "isAvailable": true,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "hasMore": true,
    "nextCursor": "019ddfe0-0005-0000-0000-000000000005",
    "limit": 10
  }
}
```

## Project Structure

```
src/
├── cache/
│   ├── adapters/          # CacheAdapter implementation
│   ├── interfaces/        # Cache contract
│   ├── proxy/             # CacheProxy with logging
│   ├── cache-lock.ts      # Stampede prevention
│   ├── cache-key.builder.ts
│   ├── redis.module.ts
│   └── redis.service.ts   # Facade for cache operations
├── property/
│   ├── dtos/
│   ├── entities/
│   ├── property.service.ts
│   ├── property.controller.ts
│   └── filters.utils.ts
├── database/
│   └── database.module.ts
└── main.ts

migrations/
seeds/
test/
├── unit/
└── e2e/
```

## Scripts

```bash
npm run build             # Build the application
npm run start:dev         # Start in watch mode
npm run migration:run     # Run migrations
npm run migration:revert  # Revert last migration
npm run seed              # Seed 100,000 property records
npm run test:unit         # Run unit tests
npm run test:e2e          # Run E2E tests
npm run lint              # Fix ESLint issues
npm run format            # Format with Prettier
k6 run load-test.js       # Run load testing
```
