# Validation Summary: How to Build a Trading Order Book with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (sorted sets, hashes, lists, Pub/Sub, Lua scripting)
- Python (redis-py client library)
- Lua (Redis server-side scripting)
- Redis CLI commands (ZADD, ZRANGE, ZREVRANGE, ZREM, HSET, HGETALL, RPUSH, LTRIM, PUBLISH)

## Sources Consulted
- Redis official documentation for ZADD — https://redis.io/commands/zadd
- Redis official documentation for ZRANGE — https://redis.io/commands/zrange
- Redis official documentation for ZREVRANGE — https://redis.io/commands/zrevrange
- Redis official documentation for ZREM — https://redis.io/commands/zrem
- Redis official documentation for HSET / HGETALL — https://redis.io/commands/hset
- Redis official documentation for RPUSH — https://redis.io/commands/rpush
- Redis official documentation for LTRIM — https://redis.io/commands/ltrim
- Redis official documentation for PUBLISH — https://redis.io/commands/publish
- Redis Lua scripting documentation — https://redis.io/docs/interact/programmability/eval-intro/
- redis-py (Python Redis client) source and documentation — https://redis-py.readthedocs.io/

## Issues Found
No technical issues found.

## Review Notes
- **ZREVRANGE deprecation**: `ZREVRANGE` was deprecated as of Redis 6.2.0 in favor of `ZRANGE ... REV`. The command still works in all current Redis versions. Since the blog post does not target a specific Redis version and the command remains functional, this is not an error, but future readers using Redis 7+ may see deprecation warnings. A future update could replace `r.zrevrange(key, 0, 0, withscores=True)` with `r.zrange(key, 0, 0, desc=True, withscores=True)`.
- **Unused Lua variable**: The `local matched = {}` variable in the Lua script is declared but never used. This is a minor code quality nit, not a functional error, and the script is explicitly noted as "simplified."
- **Atomicity of Python functions**: The `place_order` and `cancel_order` functions each issue two separate Redis commands (hset + zadd, zrem + hset) without a pipeline or transaction, so they are not atomic. For a production system this would be a concern, but the blog is demonstrating the concept and the code works as written.
- **Complexity claims are accurate**: ZADD is O(log N), ZRANGE/ZREVRANGE for a single element is O(log N + 1) = O(log N), as documented by Redis.
