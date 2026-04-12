# Validation Summary: How to Implement Sliding Window Counter in Redis Lua

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (sorted sets, Lua scripting, EVAL)
- Lua 5.1 (embedded in Redis)
- Python (redis-py client library)

## Sources Consulted
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis ZREMRANGEBYSCORE documentation: https://redis.io/docs/latest/commands/zremrangebyscore/
- Redis ZREMRANGEBYRANK documentation: https://redis.io/docs/latest/commands/zremrangebyrank/
- Redis ZADD documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZCARD documentation: https://redis.io/docs/latest/commands/zcard/
- Redis EXPIRE documentation: https://redis.io/docs/latest/commands/expire/
- redis-py Lua scripting documentation: https://redis.readthedocs.io/en/stable/lua_scripting.html

## Issues Found
- **Missing ARGV[4] documentation in Lua script**: The `sliding_window.lua` script comments documented ARGV[1] through ARGV[3] but omitted ARGV[4], which is used on line `redis.call('ZADD', key, now, now .. '-' .. ARGV[4])` as the unique request identifier. Added `-- ARGV[4]: unique request identifier` to the comment block.

## Review Notes
- The "Read-Only Sliding Window Check" section heading is slightly misleading. The script calls `ZREMRANGEBYSCORE` which is a write operation (removing expired entries). It is "read-only" in the sense that it does not add a new request, but it cannot be used with `EVAL_RO` (Redis 7.0+) or on read replicas. The body text correctly describes the behavior as "Check the current count without adding a request."
- The `multi_window_check` function evaluates each window independently. If a request is allowed by the first window but rejected by a subsequent one, the request will already have been added to the first window's sorted set. This is a known trade-off not discussed in the post, though it is a common pattern.
- All Redis commands (ZREMRANGEBYSCORE, ZCARD, EXPIRE, ZADD, ZREMRANGEBYRANK) are used correctly with proper arguments.
- The redis-py `eval()` call correctly maps keys and arguments to KEYS[1] and ARGV[1]-ARGV[4].
- The memory estimate of 100-150 bytes per sorted set entry is reasonable for members of the form "timestamp-hexstring".
- The EXPIRE TTL calculation `math.ceil(window / 1000) + 1` correctly converts the millisecond window to seconds with a 1-second buffer.
