# Validation Summary: What Does 'WRONGTYPE Operation' Mean in Redis

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- Redis (server and CLI)
- Python (redis-py client library)
- Node.js (ioredis client library)

## Sources Consulted
- Redis official documentation for WRONGTYPE error behavior: https://redis.io/docs/latest/develop/reference/protocol-spec/#resp-errors
- Redis TYPE command documentation: https://redis.io/docs/latest/commands/type/
- Redis WATCH/MULTI/EXEC transaction documentation: https://redis.io/docs/latest/commands/multi/
- Redis LPUSH command documentation: https://redis.io/docs/latest/commands/lpush/
- redis-py documentation for hset, type, and exception handling: https://redis-py.readthedocs.io/
- ioredis documentation: https://github.com/redis/ioredis

## Issues Found
1. **`safe_lpush` function used `rpush` instead of `lpush`**: The function was named `safe_lpush`, implying it wraps LPUSH (left/head push), but the implementation called `r.rpush()` (right/tail push) in both branches. Fixed both calls to use `r.lpush()` to match the function name and expected semantics.

## Review Notes
- The error message string `WRONGTYPE Operation against a key holding the wrong kind of value` is accurate and matches the actual Redis server response.
- The TYPE command return values listed (`string`, `list`, `set`, `zset`, `hash`, `stream`) are correct. The `none` return for non-existent keys is not listed in the prose but is correctly used in the Python code example (`b'none'`), which is acceptable in context.
- The redis-py code correctly uses byte comparisons (`b'none'`, `b'list'`) since `Redis()` without `decode_responses=True` returns bytes by default.
- The WATCH/MULTI/EXEC pattern is correctly structured — TYPE is checked outside the MULTI block where results are available, and WATCH provides optimistic locking.
- The ioredis `require` syntax is still valid though modern Node.js projects may prefer ES module imports. Not an error.
