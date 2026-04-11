# Validation Summary: How to Design a Notification System Using Redis in a System Design Interview

## Status
validated

## Post Type
Tutorial / System Design Walkthrough

## Technologies Covered
- Redis (Sorted Sets, Pub/Sub, Streams, Strings with INCR)
- Python (redis-py client library)
- JavaScript / Node.js (ioredis client library)
- WebSockets (real-time delivery)

## Sources Consulted
- Redis official documentation for ZADD, ZREVRANGE, ZREMRANGEBYRANK, INCR, EXPIRE, PUBLISH, XADD, XREADGROUP, XACK, XGROUP CREATE: https://redis.io/docs/latest/commands/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- ioredis documentation and subscriber mode behavior: https://github.com/redis/ioredis
- ioredis subscriber mode restrictions (subscriber clients cannot issue regular commands): https://redis.io/docs/latest/develop/interact/pubsub/

## Issues Found
1. **Undefined `redis` variable in JavaScript WebSocket code (line 195)**: The code used `redis.get(...)` to fetch the unread count on WebSocket connect, but only `subscriber` was defined as a Redis client. Additionally, an ioredis client in subscriber mode (after calling `subscribe()`) cannot execute regular commands like `get`. **Fix:** Added a separate `const redis = new Redis(...)` client instance for regular command execution, keeping `subscriber` dedicated to Pub/Sub.

## Review Notes
- The `mark_notifications_read` function accepts a `notification_ids` parameter but does not use it — it simply resets the unread count to 0. This is an acceptable simplification for a system design interview context, but in production, you would update the `isRead` field on each individual notification and decrement the counter accordingly.
- The JavaScript WebSocket example uses a single shared `subscriber` client and adds a new `message` event listener for each user connection. In production, this causes listener accumulation (N listeners for N connected users, all firing on every message). A production implementation would typically use one subscriber per connection or a routing layer. Acceptable for illustrative purposes.
- The capacity estimation section's math is internally consistent (500K * 100 = 50M writes/sec, 150KB * 100M users = 15TB). The claim that a single Redis instance handles 500K Pub/Sub publishes/sec easily is reasonable given Redis benchmarks showing millions of messages/sec throughput.
- The 90-day TTL calculation (7,776,000 seconds) is correct: 90 * 24 * 60 * 60 = 7,776,000.
- All redis-py API calls (`zadd`, `zremrangebyrank`, `expire`, `incr`, `publish`, `xadd`, `xgroup_create`, `xreadgroup`, `xack`, `zrevrange`) use correct signatures for current redis-py versions (>= 3.0).
