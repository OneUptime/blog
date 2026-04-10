# Validation Summary: How to Use Redis with Play Framework in Scala

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Play Framework (Scala)
- play-redis plugin (by karelcemus)
- Jedis (Java Redis client, v5.1.0)

## Sources Consulted
- play-redis GitHub repository and documentation: https://github.com/karelcemus/play-redis
- play-redis source code for `RedisCacheModule`, `CacheAsyncApi`, and `reference.conf`
- Play Framework Cache API documentation: https://www.playframework.com/documentation/latest/ScalaCache
- Jedis GitHub repository: https://github.com/redis/jedis
- Maven Central for version verification of play-redis and Jedis artifacts

## Issues Found

### 1. Incorrect import path for AsyncCacheApi
- **What was wrong:** The import `play.api.cache.redis.AsyncCacheApi` does not exist. play-redis provides `play.api.cache.redis.CacheAsyncApi` as its own extended API, while Play's standard cache API lives at `play.api.cache.AsyncCacheApi`.
- **What was changed:** Changed the import to `play.api.cache.AsyncCacheApi`, which is Play's standard async cache API that play-redis implements. This is consistent with the `getOrElseUpdate` method used in the code, which belongs to Play's standard `AsyncCacheApi`.
- **Why:** Using the non-existent import would cause a compilation error.

### 2. Incorrect configuration root key
- **What was wrong:** The configuration block used `redis { ... }` as the root key. play-redis expects configuration under `play.cache.redis { ... }`.
- **What was changed:** Changed `redis {` to `play.cache.redis {`.
- **Why:** Using the wrong configuration root means play-redis would not pick up the settings and would fall back to defaults from its `reference.conf`.

### 3. Invalid configuration keys (timeout and pool)
- **What was wrong:** The configuration included `timeout: 5s` and a `pool { max-total, max-idle, min-idle }` block. These are not valid play-redis configuration keys. The pool settings resemble Jedis pool configuration, which was being conflated with play-redis config. play-redis uses keys like `sync-timeout`, `redis-timeout`, and `connection-timeout` for timeouts, and does not expose pool tuning via HOCON.
- **What was changed:** Removed the `timeout` and `pool` block, keeping only the valid play-redis configuration keys (`host`, `port`, `password`, `database`).
- **Why:** Including invalid configuration keys is misleading and would have no effect.

## Review Notes
- The play-redis version `3.0.0` is correct for Play 2.9.x. If targeting Play 3.0.x, the version should be `5.3.0` or later. The blog does not specify a Play Framework version, so this is acceptable but could be noted.
- Jedis `5.1.0` is a valid version but not the latest in the 5.x line (5.2.0 is newer). This is acceptable for a tutorial.
- The `setex` method in Jedis 5.x takes `long` for the TTL parameter, but Scala's implicit widening from `Int` to `Long` makes this a non-issue in practice.
- The Jedis `JedisPoolConfig` class is not deprecated in 5.x but has been deprecated in the 6.x development line in favor of `ConnectionPoolConfig`.
- The Jedis code correctly uses try/finally with `jedis.close()` to return connections to the pool, which is a good pattern.
