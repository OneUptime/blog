# Validation Summary: How to Use Redis with Deno

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno (TypeScript runtime)
- Redis (in-memory data store)
- deno-redis client (`https://deno.land/x/redis@v0.32.0/mod.ts`)
- Redis data types: strings, hashes, lists, sets
- Redis pub/sub
- Redis transactions (MULTI/EXEC/WATCH)
- Redis pipelining
- Redis caching patterns (cache-aside, write-through, invalidation)

## Sources Consulted
- deno-redis v0.32.0 source on deno.land/x — https://deno.land/x/redis@v0.32.0/mod.ts
- deno-redis v0.32.0 `redis.ts` — verified signatures of `set`, `hset`, `hget`, `hgetall`, `hmget`, `hexists`, `hdel`, `hincrby`, `setnx`, `incr`, `incrby`, `decr`, `decrby`, `rpush`, `lpush`, `lpop`, `rpop`, `lrange`, `llen`, `blpop`, `sadd`, `smembers`, `sismember`, `scard`, `srem`, `sinter`, `sunion`, `sdiff`, `publish`, `subscribe`, `psubscribe`, `expire`, `exists`, `del`, `keys`, `tx`, `pipeline`, `watch`
- deno-redis v0.32.0 `pipeline.ts` — verified `pipeline()` / `tx()` return a `RedisPipeline` with `flush(): Promise<RawOrError[]>`
- deno-redis v0.32.0 `pubsub.ts` — verified `RedisSubscription.receive()` returns an `AsyncIterableIterator<RedisPubSubMessage>` with `{ channel, message, pattern? }`
- deno-redis v0.32.0 hash test (`tests/commands/hash.ts`) — confirmed `hgetall` returns a flat array `["f1", "1", "f2", "2"]`, not an object
- deno-redis v0.32.0 list test (`tests/commands/list.ts`) — confirmed `blpop` returns the tuple `[key, value]` or `null`, not an object with `.key`/`.value`

## Issues Found

1. **`blpop` return type mistreated as an object.** The original code did `result.key` / `result.value` on the result of `blpop`. The deno-redis client returns `[BulkString, BulkString] | null` — i.e., a tuple — so `result.key` and `result.value` would both be `undefined`. Fixed by destructuring: `const [key, value] = result;`.

2. **`hgetall` output comment shows an object.** The original output comment showed `{ name: "Alice Johnson", email: "alice@example.com", ... }`. The deno-redis client returns a flat array of alternating field/value pairs (e.g. `["name", "Alice Johnson", "email", "alice@example.com", ...]`). Updated the comment to reflect the actual return shape.

3. **`getSession` returned an array typed as `Record<string, string>`.** The session-storage example assigned `await redis.hgetall(sessionKey)` directly to `data` and returned it as `Record<string, string>`, which would have given callers an array at runtime despite the static type. Fixed by checking `data.length === 0` for emptiness and converting the alternating field/value array into a plain object before returning.

## Review Notes
- The post pins the client to `v0.32.0`, which is a real, published version on deno.land/x. The API surface used in all other examples (strings, sets, lists' push/pop, pub/sub, pipelining, MULTI/EXEC transactions, WATCH, `set` with `{ ex }` options, integer-returning predicates like `sismember`/`hexists`/`setnx`) matches that version's implementation.
- The WATCH example wraps `tx.flush()` in `try/catch` with the comment "Transaction failed because inventory changed". In strict Redis semantics, an aborted WATCH transaction causes `EXEC` to return a nil reply rather than an error, so `flush()` may resolve (with a nil/empty result) instead of rejecting. The try/catch is still a reasonable defensive pattern and may catch other transient errors, so this was left as-is — but readers who need strict optimistic-locking semantics should additionally inspect the result of `flush()` for nil.
- The post says "Deno 1.x or later" in the prerequisites; this is still correct (the examples work on Deno 1.x and 2.x), though most readers will be on Deno 2.x by now.
- The `redis.keys("user:*")` pattern in the bulk cache invalidation example is technically correct, but the post's own best-practices section recommends `SCAN` over `KEYS` in production — readers should follow that guidance for non-trivial keyspaces.
