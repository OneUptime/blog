# Validation Summary: How to Use Redis Sorted Sets for Time-Based Expiration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis sorted sets
- Redis key expiration / TTL
- Redis Lua scripting with EVAL
- redis-py
- Python

## Sources Consulted
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zrangebyscore/
- Redis ZREMRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zremrangebyscore/
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Redis ZCOUNT command documentation: https://redis.io/docs/latest/commands/zcount/
- Redis ZCARD command documentation: https://redis.io/docs/latest/commands/zcard/
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/programmability/eval-intro/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- The post used `ZRANGEBYSCORE` and redis-py's `zrangebyscore()` throughout score-range read examples. Redis marks `ZRANGEBYSCORE` as deprecated as of Redis 6.2.0, so these examples were updated to `ZRANGE` with `BYSCORE` via redis-py's `zrange(..., byscore=True)`.
- The rate limiter claimed atomic behavior but performed cleanup/count/read in a pipeline and then added the new request in separate commands. This could exceed the limit under concurrent requests. The example was changed to use a Lua script that removes expired entries, checks the count, adds the new request, sets the key expiration, and computes retry timing as one server-side operation.
- The rate limiter used `id(now)` as part of the sorted-set member. This was replaced with a UUID-based member to avoid relying on Python object identity for uniqueness.
- The scheduled queue Lua script used deprecated `ZRANGEBYSCORE`. It was updated to `ZRANGE ... BYSCORE ... LIMIT`.
- The background cleanup example registered `rate_limits:*`, but Redis sorted set commands do not expand wildcard key patterns. The example now registers a concrete sorted set key.
- The lazy cleanup helper accepted `batch_size` but removed all expired entries with `ZREMRANGEBYSCORE`. It now reads at most `batch_size` expired members with `ZRANGE ... BYSCORE LIMIT`, removes that batch with `ZREM`, and then returns active items.

## Review Notes
- `ZREMRANGEBYSCORE` remains valid for bulk removal by score and was kept where removal by score is intended.
- The Python code blocks were checked with `python3` AST parsing and all snippets compile syntactically.
