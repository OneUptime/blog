# Validation Summary: How to Implement Exactly-Once Processing with Redis Streams

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Streams (consumer groups, XREADGROUP, XACK, XPENDING)
- Python (redis-py client library)
- Redis Lua scripting (EVAL)
- PostgreSQL (psycopg2, ON CONFLICT / upsert)
- Redis CLI (KEYS, XPENDING commands)

## Sources Consulted
- Redis Streams documentation: https://redis.io/docs/data-types/streams/
- Redis XREADGROUP command reference: https://redis.io/commands/xreadgroup/
- Redis XACK command reference: https://redis.io/commands/xack/
- Redis XPENDING command reference: https://redis.io/commands/xpending/
- Redis EVAL (Lua scripting) documentation: https://redis.io/commands/eval/
- redis-py documentation: https://redis-py.readthedocs.io/
- PostgreSQL INSERT ... ON CONFLICT documentation: https://www.postgresql.org/docs/current/sql-insert.html

## Issues Found
1. **Misleading "Redis Set" terminology (line 19)**: The text said "Store processed IDs in a Redis Set with a TTL" but the code uses individual string keys via the `SET` command, not the Redis Set data structure (`SADD`/`SMEMBERS`). "Redis Set" is a specific data type in Redis and this phrasing was technically inaccurate. Changed to "Store processed IDs as Redis keys with a TTL."

## Review Notes
- The Lua script accepts `msg_id` as `ARGV[1]` but never uses it — the message ID is already embedded in the key names passed as `KEYS`. This is unused but harmless.
- The monitoring section uses the `KEYS` command, which blocks the Redis server and is discouraged in production. For monitoring/debugging contexts this is acceptable, but `SCAN` would be the production-safe alternative.
- The `safe_process` function accepts a `consumer` parameter that is unused — `XACK` only requires the stream key, group name, and message IDs, not the consumer name. This is not incorrect but could be slightly confusing.
- The first Python example has a race condition between `r.exists()` and `pipe.set()`, but the post appropriately addresses this by introducing the Lua-based atomic approach in the next section.
- All Redis command syntax, redis-py API usage, PostgreSQL upsert syntax, and psycopg2 patterns are correct and current.
