# Validation Summary: How to Design a Real-Time Chat System Using Redis

## Status
validated

## Post Type
Tutorial / System Design Guide

## Technologies Covered
- Redis (Pub/Sub, Streams, Sorted Sets, Hashes, key expiration)
- Node.js with node-redis v4 client library
- WebSockets (conceptual)
- Redis Cluster (conceptual)

## Sources Consulted
- Redis PUBLISH command documentation: https://redis.io/docs/latest/commands/publish/
- Redis SUBSCRIBE command documentation: https://redis.io/docs/latest/commands/subscribe/
- Redis XADD command documentation: https://redis.io/docs/latest/commands/xadd/
- Redis XREVRANGE command documentation: https://redis.io/docs/latest/commands/xrevrange/
- Redis XRANGE command documentation: https://redis.io/docs/latest/commands/xrange/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis ZINCRBY command documentation: https://redis.io/docs/latest/commands/zincrby/
- Redis ZRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zrangebyscore/
- Redis HEXPIRE (7.4+) documentation: https://redis.io/docs/latest/commands/hexpire/
- node-redis v4 migration guide: https://github.com/redis/node-redis/blob/master/docs/v3-to-v4.md
- node-redis Pub/Sub documentation: https://github.com/redis/node-redis/blob/master/docs/pub-sub.md

## Issues Found

### 1. EXPIRE targeting wrong key in presence tracking section
**What was wrong:** The command `EXPIRE presence:room:42:alice 60` targeted a key that was never created. The HSET command creates the hash at key `presence:room:42`, but the EXPIRE was applied to `presence:room:42:alice` (a nonexistent key). Redis cannot expire individual hash fields (prior to Redis 7.4's HEXPIRE). The EXPIRE would silently return 0 and do nothing.

**What was changed:** Fixed the EXPIRE to target the correct key `presence:room:42` and updated the comment to clarify that EXPIRE applies to the whole hash key. Also added "(preferred)" to the per-key approach comment, since that approach provides the fine-grained TTL that the hash approach cannot.

### 2. Missing `await client.connect()` in Node.js Pub/Sub code
**What was wrong:** In node-redis v4, clients must be explicitly connected via `await client.connect()` before issuing any commands. The code created `pub` and `sub` clients but never connected them, which would throw `ClientClosedError` at runtime.

**What was changed:** Added `await pub.connect();` and `await sub.connect();` after client creation.

### 3. Missing `await` on `sub.subscribe()`
**What was wrong:** In node-redis v4, `subscribe()` returns a Promise and must be awaited. Without `await`, the subscription may not be active when messages arrive.

**What was changed:** Added `await` before `sub.subscribe(...)`.

## Review Notes
- `ZRANGEBYSCORE` (used in the unread counters section) has been deprecated since Redis 6.2 in favor of `ZRANGE ... BYSCORE`. The command still works and is not incorrect, but new code should prefer the unified `ZRANGE` syntax. Not changed since it remains functional.
- The `redis.keys()` call in the `getOnlineUsers` function uses the KEYS command, which is O(N) and blocks the Redis server while scanning the entire keyspace. In production, `SCAN` (or `client.scanIterator()` in node-redis v4) should be used instead. Not changed since the post is focused on system design concepts rather than production-ready code.
- In Redis Cluster, regular `PUBLISH` broadcasts messages to all nodes, not just the shard owning the channel. Redis 7.0 introduced sharded Pub/Sub (`SPUBLISH`/`SSUBSCRIBE`) which routes messages to the correct shard using hash slots. The post recommends hash tags for Cluster sharding but doesn't distinguish between regular and sharded Pub/Sub. This is a nuance that could be added in a future update.
- The post's scaling table describes Pub/Sub as "stateless, horizontally scalable" which is somewhat misleading in a Cluster context since regular Pub/Sub fan-out increases with cluster size. This is acceptable for a system design overview but worth noting.
