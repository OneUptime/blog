# Validation Summary: How to Use Redis with Bun

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bun (JavaScript runtime)
- Redis (in-memory data store)
- ioredis (Node.js Redis client library)
- TypeScript
- Node.js `crypto` module (randomBytes)

## Sources Consulted
- Official ioredis GitHub repository and source code: https://github.com/redis/ioredis
- ioredis `RedisOptions.ts` type definitions: https://github.com/redis/ioredis/blob/main/lib/redis/RedisOptions.ts
- ioredis API documentation: https://redis.github.io/ioredis/
- Official Redis command documentation: https://redis.io/commands/
- Bun documentation for npm package compatibility: https://bun.sh/docs

## Issues Found
1. **Invalid ioredis option `retryDelayOnFailover`** — The "Connecting to Redis" section used `retryDelayOnFailover: 100` as part of the `new Redis({...})` configuration. This option does not exist in ioredis (it is not present in `CommonRedisOptions`, `StandaloneConnectionOptions`, or `SentinelConnectionOptions`). ioredis silently ignores unknown options, so it would not error, but the option does nothing. It was likely confused with a node-redis option or hallucinated. Replaced it with the correct option `retryStrategy: (times) => Math.min(times * 50, 2000)`, which is the documented ioredis mechanism for controlling reconnect/retry delay behavior (this matches the library's default strategy).

## Review Notes
- **HMSET deprecation**: The post uses `redis.hmset(...)` in multiple places. The Redis `HMSET` command was deprecated in Redis 4.0.0 in favor of the variadic `HSET`. ioredis still supports `hmset` so the code works, but new code should prefer `hset` with multiple field/value pairs.
- **Bun native Redis client**: As of Bun 1.2.9, Bun ships a built-in `Bun.redis` client. The post correctly uses ioredis (a fully supported approach), but readers may also want to be aware of the native option for greenfield projects.
- **KEYS in production**: The `invalidatePattern` method in the cache-aside example uses `redis.keys(pattern)`. The post's own "Best Practices" section correctly advises using `SCAN` instead of `KEYS` in production — this is acknowledged but the example itself doesn't follow that guidance. Not technically wrong, but worth flagging to readers.
- **SessionStore `destroySession`**: Calling `this.getSession()` inside `destroySession` has the side effect of refreshing the session TTL and updating `lastAccess` right before deletion. Functionally fine since the key is then deleted, but a minor inefficiency.
- All ioredis API methods used (string ops, hash ops, list ops including `blpop`, set ops, sorted-set ops, `multi`/`exec`, `watch`/`unwatch`, pub/sub `subscribe`/`psubscribe`/`publish` and their callback signatures, pipelining via `redis.pipeline()`) are accurate against current ioredis documentation.
- `bun add ioredis` is the correct install command for Bun's package manager.
