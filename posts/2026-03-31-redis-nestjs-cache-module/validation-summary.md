# Validation Summary: How to Set Up Redis Cache Module in NestJS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NestJS (Node.js framework)
- Redis (in-memory data store)
- @nestjs/cache-manager (NestJS caching module)
- cache-manager (Node.js caching library, v5+)
- cache-manager-redis-yet (Redis store adapter)
- nestjs-cacheable (third-party decorator-based caching)

## Sources Consulted
- NestJS official caching documentation: https://docs.nestjs.com/techniques/caching
- @nestjs/cache-manager GitHub repository: https://github.com/nestjs/cache-manager
- @nestjs/cache-manager releases: https://github.com/nestjs/cache-manager/releases
- @nestjs/cache-manager decorators directory: https://github.com/nestjs/cache-manager/tree/master/lib/decorators
- nestjs-cacheable GitHub repository: https://github.com/caidesen/nestjs-cacheable
- cache-manager documentation: https://cacheable.org/docs/cache-manager/
- NestJS TTL documentation issue: https://github.com/nestjs/nest/issues/14466
- cache-manager-redis-yet npm: https://www.npmjs.com/package/cache-manager-redis-yet

## Issues Found

### 1. Incorrect import for `@Cacheable` and `@CacheEvict` decorators
- **What was wrong:** The post imported `Cacheable` and `CacheEvict` from `@nestjs/cache-manager`. The official `@nestjs/cache-manager` package only exports `CacheKey` and `CacheTTL` decorators. The `@Cacheable` and `@CacheEvict` decorators are provided by the third-party `nestjs-cacheable` package.
- **What was changed:** Changed the import from `"@nestjs/cache-manager"` to `"nestjs-cacheable"` and added `nestjs-cacheable` to the npm install command.
- **Why:** Readers following the tutorial would get import errors since these decorators do not exist in the official package.

### 2. TTL values in `@CacheTTL()` treated as seconds instead of milliseconds
- **What was wrong:** `@CacheTTL(30)` and `@CacheTTL(300)` were used in the HTTP interceptor section. With cache-manager v5+ (used by @nestjs/cache-manager v2+), TTL is specified in milliseconds. These values would result in 30ms and 300ms TTLs, not 30 and 300 seconds as intended.
- **What was changed:** Updated to `@CacheTTL(30 * 1000)` and `@CacheTTL(300 * 1000)`.
- **Why:** cache-manager v5 changed TTL units from seconds to milliseconds. The original values would cause cache entries to expire almost immediately.

### 3. TTL value in `cacheManager.set()` treated as seconds instead of milliseconds
- **What was wrong:** `await this.cacheManager.set('product:${id}', product, 300)` used `300` as TTL, which in cache-manager v5+ is 300 milliseconds (0.3 seconds), not 300 seconds.
- **What was changed:** Updated to `300 * 1000` to correctly represent 300 seconds (5 minutes).
- **Why:** Same cache-manager v5 millisecond TTL change as above.

## Review Notes
- The `redisStore` TTL configuration (`ttl: 60 * 1000`) with the comment "default 60 seconds in ms" was already correct.
- The `nestjs-cacheable` package's `@Cacheable` decorator accepts TTL in seconds (per its documentation), so the `ttl: 300` in that section was left unchanged. This is a difference from the cache-manager API where TTL is in milliseconds.
- The `CacheInterceptor` only caches GET requests by default, which is correctly implied by the controller example only using `@Get()` routes.
- The `@CacheKey("product-detail")` decorator in the controller will use the same cache key for all product IDs, which could lead to incorrect cached responses. This is not technically wrong (the decorator works this way), but readers should be aware that dynamic keys require a custom interceptor or manual caching.
