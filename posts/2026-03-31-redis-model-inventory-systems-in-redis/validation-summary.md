# Validation Summary: How to Model Inventory Systems in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (commands: SET, GET, DECR, INCRBY, HSET, HGET, HINCRBY, EVAL, ZADD, ZRANGEBYSCORE, ZREM, PUBLISH)
- Redis Lua scripting
- Python (redis-py client library)

## Sources Consulted
- Redis DECR/INCRBY documentation: https://redis.io/docs/latest/commands/decr/ and https://redis.io/docs/latest/commands/incrby/
- Redis HSET/HGET/HINCRBY documentation: https://redis.io/docs/latest/commands/hset/ and https://redis.io/docs/latest/commands/hincrby/
- Redis EVAL and Lua scripting: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- Redis ZADD/ZRANGEBYSCORE documentation: https://redis.io/docs/latest/commands/zadd/ and https://redis.io/docs/latest/commands/zrangebyscore/
- Redis PUBLISH documentation: https://redis.io/docs/latest/commands/publish/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- Lua `tonumber` behavior with non-numeric types (returns nil for false/nil inputs)

## Issues Found
No technical issues found.

## Review Notes
- The `confirm_purchase` function uses two separate `hincrby` calls (decrement reserved, decrement total) which are not atomic. In a production system, this should be a Lua script to prevent inconsistency if the process crashes between the two calls. Acceptable for a tutorial.
- The `RELEASE_SCRIPT` does not validate that the reserved quantity is sufficient before releasing, which could make the reserved count go negative. Acceptable simplification for a tutorial.
- The `expire_reservations` function has a potential TOCTOU (time-of-check-to-time-of-use) issue: between `zrangebyscore` and `zrem`, another worker could process the same expired entry, leading to double-release. A production implementation would use `ZPOPMIN` or a Lua script for atomic claim-and-remove.
- `ZRANGEBYSCORE` was deprecated in Redis 6.2.0 in favor of `ZRANGE ... BYSCORE`, but both the Redis command and the redis-py `zrangebyscore()` method still work. Not an error, just worth noting for future updates.
