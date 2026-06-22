# Validation Summary: How to Use Redis for Real-Time Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis strings, hashes, sorted sets, HyperLogLog, bitmaps, Pub/Sub, Streams, Lua scripting, TTLs, and pipelining
- Python
- redis-py

## Sources Consulted
- Redis command documentation: https://redis.io/docs/latest/commands/
- Redis INCR documentation: https://redis.io/docs/latest/commands/incr/
- Redis EXPIRE documentation: https://redis.io/docs/latest/commands/expire/
- Redis ZINCRBY documentation: https://redis.io/docs/latest/commands/zincrby/
- Redis ZRANGE documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZREVRANGE deprecation notice: https://redis.io/docs/latest/commands/zrevrange/
- Redis ZREVRANK documentation: https://redis.io/docs/latest/commands/zrevrank/
- Redis HyperLogLog documentation: https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/
- Redis bitmap command documentation: https://redis.io/docs/latest/commands/setbit/, https://redis.io/docs/latest/commands/getbit/, https://redis.io/docs/latest/commands/bitcount/, https://redis.io/docs/latest/commands/bitop/
- Redis Pub/Sub documentation: https://redis.io/docs/latest/commands/publish/, https://redis.io/docs/latest/commands/subscribe/
- Redis Streams documentation: https://redis.io/docs/latest/develop/data-types/streams/
- Redis XREADGROUP, XGROUP CREATE, and XACK documentation: https://redis.io/docs/latest/commands/xreadgroup/, https://redis.io/docs/latest/commands/xgroup-create/, https://redis.io/docs/latest/commands/xack/
- Redis pipelining documentation: https://redis.io/docs/latest/develop/using-commands/pipelining/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- Replaced `zrevrange()` examples with `zrange(..., desc=True, withscores=True)` because Redis marks `ZREVRANGE` as deprecated as of Redis 6.2 and recommends `ZRANGE` with `REV`.
- Corrected the article-rank helper's type hint and docstring. The function returned a 1-indexed rank or `None`, while the original annotation and text implied a non-null 0-indexed integer.
- Fixed the time-decayed ranking example. The original `math.exp(timestamp / decay_factor)` used the Unix timestamp directly and overflows in Python; it also boosted newer items rather than decaying old scores. The revised example stores the first-seen time and cumulative score, then computes a bounded age-based decayed score.
- Fixed the Lua sliding-window script TTL. The script passed a millisecond window value to Redis `EXPIRE`, which expects seconds. It now converts the millisecond window to seconds before setting expiration.

## Review Notes
- The examples are intentionally compact and assume a reachable Redis instance plus the `redis` Python package.
- By default, redis-py returns bytes for many read operations unless configured with `decode_responses=True`; the examples either convert numeric values directly or print raw values, which is acceptable for a short guide.
- The Streams example acknowledges messages after processing, but production systems should also handle pending-entry recovery for crashed consumers.
