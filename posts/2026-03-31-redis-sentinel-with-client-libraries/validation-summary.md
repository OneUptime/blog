# Validation Summary: How to Use Redis Sentinel with Client Libraries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Sentinel
- Python redis-py (Sentinel module)
- Node.js ioredis
- Java Jedis (JedisSentinelPool)
- Java Lettuce (RedisURI Builder with Sentinel)

## Sources Consulted
- redis-py source code (v7.x) - `redis/sentinel.py`, `redis/retry.py`, `redis/backoff.py` - https://github.com/redis/redis-py
- ioredis source code (v5.x) - TypeScript type definitions and SentinelConnectionOptions - https://github.com/redis/ioredis
- Jedis source code - `JedisSentinelPool.java` constructor overloads - https://github.com/redis/jedis
- Lettuce source code - `RedisURI.java` Builder class and Sentinel wiki - https://github.com/lettuce-io/lettuce-core
- Lettuce Redis Sentinel documentation - https://github.com/lettuce-io/lettuce-core/wiki/Redis-Sentinel

## Issues Found
- **Lettuce `RedisURI.builder()` cannot be used with Sentinel**: The blog used `RedisURI.builder()` which creates a standalone Redis URI builder. Calling `.withSentinel()` on a standalone builder will fail at runtime with an assertion error (`"Cannot use with Redis mode."`). Fixed by replacing `RedisURI.builder()` with `RedisURI.Builder.sentinel("sentinel-1", 26379, "mymaster")` and chaining additional sentinels with `.withSentinel()`. This also removed the now-unnecessary `.withSentinelMasterId("mymaster")` call since the master ID is passed directly to the `sentinel()` factory method.

## Review Notes
- The Sentinel ports (26379, 26380, 26381) used across examples are atypical for a multi-host setup where each host would normally use the default port 26379. This is not incorrect but could confuse readers into thinking each Sentinel must use a different port.
- The Python example has an unused `import redis` statement. Not a bug, but unnecessary.
- In the ioredis example, `role: 'master'` is the default and could be omitted, though including it explicitly is fine for clarity.
- The `natMap: {}` in the ioredis read replica example is a no-op; a real NAT mapping would need actual host:port entries. The comment correctly describes when it is needed.
