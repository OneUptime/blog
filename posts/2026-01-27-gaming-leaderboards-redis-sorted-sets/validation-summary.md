# Validation Summary: How to Build Gaming Leaderboards with Redis Sorted Sets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Sorted Sets
- Redis sorted set commands: ZADD, ZRANGE, ZREVRANK, ZSCORE, ZCARD, ZINCRBY, ZREM
- ioredis for Node.js
- JavaScript
- Express

## Sources Consulted
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZRANGEBYSCORE deprecation documentation: https://redis.io/docs/latest/commands/zrangebyscore/
- Redis ZREVRANGE deprecation documentation: https://redis.io/docs/latest/commands/zrevrange/
- Redis ZREVRANK command documentation: https://redis.io/docs/latest/commands/zrevrank/
- Redis ZINCRBY command documentation: https://redis.io/docs/latest/commands/zincrby/
- Redis sorted sets data type documentation: https://redis.io/docs/latest/develop/data-types/sorted-sets/
- Redis Node.js client migration documentation covering ioredis pipelining: https://redis.io/docs/latest/develop/clients/nodejs/migration/

## Issues Found
- The examples used `ZREVRANGE` through `redis.zrevrange(...)`. Redis marks `ZREVRANGE` as deprecated as of Redis 6.2.0, so the examples now use `redis.zrange(..., 'REV', 'WITHSCORES')`.
- The tie helper used `zrangebyscore`, which Redis marks as deprecated as of Redis 6.2.0. It now uses `redis.zrange(..., 'BYSCORE')`.
- `TimeBasedLeaderboard.incrementScore()` returned `results[results.length - 2][1]`, which points to the monthly `EXPIRE` result rather than the all-time `ZINCRBY` result. It now reads the final pipeline result.
- The Express API's "players around me" endpoint queried `lb.basic`, but score submissions never updated that leaderboard. The submit handler now updates `lb.basic` alongside the timed and high-score leaderboards.
- The tie-breaking comments claimed microsecond precision and referenced an unused `timestampPrecision` field. The misleading comment and unused field were removed, and the comment now states the whole-number score assumption for the composite-score approach.

## Review Notes
- JavaScript snippets were syntax-checked with `node --check` after edits.
- Redis sorted set scores are floating-point values, so the composite-score tie-breaking approach is best kept to whole-number game scores with bounded score ranges. For exact global ordering across arbitrary decimal scores, storing timestamps separately and resolving ties explicitly is safer.
