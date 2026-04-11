# Validation Summary: How to Build a CQRS Read Model with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Hashes, Sorted Sets, Sets, Streams, Consumer Groups)
- Node.js
- ioredis (Redis client library for Node.js)
- CQRS (Command Query Responsibility Segregation) architecture pattern
- Event Sourcing / Event projection

## Sources Consulted
- ioredis API documentation: https://github.com/redis/ioredis/blob/main/API.md
- Redis HSET command: https://redis.io/commands/hset/
- Redis ZADD command: https://redis.io/commands/zadd/
- Redis SADD / SREM commands: https://redis.io/commands/sadd/ and https://redis.io/commands/srem/
- Redis XREADGROUP command: https://redis.io/commands/xreadgroup/
- Redis XGROUP command: https://redis.io/commands/xgroup-create/
- Redis XACK command: https://redis.io/commands/xack/
- Redis SSCAN command: https://redis.io/commands/sscan/
- Redis Streams tutorial: https://redis.io/docs/latest/develop/data-types/streams/

## Issues Found

1. **Missing `sadd` to `orders:pending` in `OrderCreated` handler.** The `OrderPaid` and `OrderCancelled` handlers both called `redis.srem('orders:pending', orderId)` to remove the order from the pending set, but the `OrderCreated` handler never added the order to that set in the first place. While `SREM` on a non-existent member doesn't error, this was a logic bug — orders would never appear in the pending set. Fixed by adding `await redis.sadd('orders:pending', orderId)` to the `OrderCreated` handler.

2. **Misleading comment on stream field array indexing.** The comment on `fields[1]` said "field name at index 1" but `fields[1]` is actually the field *value*, not the field name. In ioredis, `XREADGROUP` returns stream entry fields as a flat array `[key0, val0, key1, val1, ...]`, so index 0 is the key `'type'` and index 1 is its value. Fixed the comments to accurately describe the array layout.

## Review Notes
- The `redis.keys()` usage in `rebuildReadModel()` is technically correct but not recommended for production use on large datasets, as `KEYS` blocks the Redis server. A production implementation should use `SCAN` instead. This is a best-practice concern rather than a correctness issue, so it was left as-is since the code is presented as a tutorial example.
- `ZREVRANGE` is considered deprecated since Redis 6.2 in favor of `ZRANGE` with the `REV` option, but it still works and ioredis supports it. Left as-is since it remains functional and the post doesn't target a specific Redis version.
- The `SSCAN`-based pagination in `getPaidOrders` works but `COUNT` is a hint, not a guarantee — the actual number of returned elements may vary. This is inherent to cursor-based iteration and is acceptable for the tutorial context.
