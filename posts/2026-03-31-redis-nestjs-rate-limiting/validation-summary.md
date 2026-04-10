# Validation Summary: How to Build NestJS Rate Limiting with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NestJS (Node.js framework)
- @nestjs/throttler (v6.x)
- @nest-lab/throttler-storage-redis (v1.x)
- ioredis (Redis client for Node.js)
- @nestjs-modules/ioredis
- Redis

## Sources Consulted
- @nestjs/throttler npm package (v6.5.0) - https://www.npmjs.com/package/@nestjs/throttler
- @nest-lab/throttler-storage-redis npm package (v1.2.0) - https://www.npmjs.com/package/@nest-lab/throttler-storage-redis
- @nestjs-modules/ioredis npm package (v2.2.1) - https://www.npmjs.com/package/@nestjs-modules/ioredis
- NestJS Throttler documentation - https://docs.nestjs.com/security/rate-limiting
- @nestjs/throttler source code and type definitions for API verification

## Issues Found
- **TTL unit error (3 occurrences):** Since `@nestjs/throttler` v5 (released mid-2023), the `ttl` parameter is specified in **milliseconds**, not seconds. The post used `ttl: 60` in three locations, which would result in a 60-millisecond window instead of the intended 60-second window. Fixed all three to `ttl: 60000`:
  1. `ThrottlerModule.forRoot({ throttlers: [{ ttl: 60, ... }] })` changed to `ttl: 60000`
  2. `@Throttle({ default: { ttl: 60, limit: 100 } })` changed to `ttl: 60000`
  3. `@Throttle({ default: { ttl: 60, limit: 5 } })` changed to `ttl: 60000`

## Review Notes
- The custom `RateLimitGuard` in Option 2 correctly uses its own time-bucketing logic with `Date.now() / 60000` and a 60-second TTL on the Redis key, so it is not affected by the ThrottlerModule ttl unit issue.
- The `@nest-lab/throttler-storage-redis` v1.2.0 requires `@nestjs/throttler >= 6.0.0` as a peer dependency. The post does not pin versions, which is fine but worth noting.
- All package names, import paths, class names, decorator syntax, and constructor signatures were verified as correct.
- The `redis-cli keys` command shown in the "Check Redis Keys" section is fine for debugging but should not be used in production on large datasets (this is a common caveat but not an error in the post's context).
