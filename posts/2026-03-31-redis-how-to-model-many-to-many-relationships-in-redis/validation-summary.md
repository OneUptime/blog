# Validation Summary: How to Model Many-to-Many Relationships in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (set commands: SADD, SMEMBERS, SINTER, SUNION, SDIFF, SINTERSTORE, SUNIONSTORE, SCARD, SREM)
- Redis sorted set commands (ZADD, ZRANGE)
- Python (redis-py client library)

## Sources Consulted
- Redis SADD documentation: https://redis.io/docs/latest/commands/sadd/
- Redis SMEMBERS documentation: https://redis.io/docs/latest/commands/smembers/
- Redis SINTER documentation: https://redis.io/docs/latest/commands/sinter/
- Redis SUNION documentation: https://redis.io/docs/latest/commands/sunion/
- Redis SDIFF documentation: https://redis.io/docs/latest/commands/sdiff/
- Redis SINTERSTORE documentation: https://redis.io/docs/latest/commands/sinterstore/
- Redis SCARD documentation: https://redis.io/docs/latest/commands/scard/
- Redis ZRANGE documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZREVRANGE documentation (deprecated): https://redis.io/docs/latest/commands/zrevrange/
- Redis ZRANGEBYSCORE documentation (deprecated): https://redis.io/docs/latest/commands/zrangebyscore/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/

## Issues Found
1. **`ZREVRANGE` is deprecated since Redis 6.2.0**: The command `ZREVRANGE user:1:following 0 9 WITHSCORES` was replaced with the modern equivalent `ZRANGE user:1:following 0 9 REV WITHSCORES`. The `ZREVRANGE` command is deprecated in favor of the extended `ZRANGE` command with the `REV` option.

2. **`ZRANGEBYSCORE` is deprecated since Redis 6.2.0**: The command `ZRANGEBYSCORE user:1:following 1711920000 +inf` was replaced with `ZRANGE user:1:following 1711920000 +inf BYSCORE`. The `ZRANGEBYSCORE` command is deprecated in favor of `ZRANGE` with the `BYSCORE` option.

## Review Notes
- The post correctly notes that redis-py `pipeline()` should be used for atomic updates to both sides of a relationship. In redis-py, `pipeline()` defaults to `transaction=True`, which wraps commands in MULTI/EXEC, providing true atomicity. The general Redis concept of "pipelining" (batching commands to reduce round trips) is distinct from transactions, but the Python code as written is indeed atomic.
- All expected command outputs were verified against the data setup in each example and are correct.
- The O(1) complexity claim for SCARD is accurate per Redis documentation.
- Key naming conventions follow standard Redis colon-separated patterns.
