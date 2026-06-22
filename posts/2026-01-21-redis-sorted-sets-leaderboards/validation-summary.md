# Validation Summary: How to Use Redis Sorted Sets for Leaderboards and Rankings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis sorted sets
- Redis sorted set commands: ZADD, ZRANGE, ZRANK, ZREVRANK, ZSCORE, ZINCRBY, ZREM, ZPOPMIN, ZPOPMAX, BZPOPMIN, BZPOPMAX, ZUNIONSTORE, ZINTERSTORE, ZCARD, ZCOUNT, ZLEXCOUNT
- Python with redis-py
- Node.js with ioredis
- Go with go-redis/v9

## Sources Consulted
- Redis sorted sets documentation: https://redis.io/docs/latest/develop/data-types/sorted-sets/
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZRANGEBYSCORE deprecation documentation: https://redis.io/docs/latest/commands/zrangebyscore/
- Redis ZREVRANGE deprecation documentation: https://redis.io/docs/latest/commands/zrevrange/
- Redis ZPOPMIN command documentation: https://redis.io/docs/latest/commands/zpopmin/
- Redis BZPOPMIN command documentation: https://redis.io/docs/latest/commands/bzpopmin/
- Redis ZLEXCOUNT command documentation: https://redis.io/docs/latest/commands/zlexcount/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- ioredis documentation: https://github.com/redis/ioredis
- go-redis/v9 package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- go-redis sorted set command implementation notes: https://github.com/redis/go-redis/blob/master/sortedset_commands.go

## Issues Found
- The Redis command examples used `ZREVRANGE` and `ZRANGEBYSCORE`, which Redis documents as deprecated as of Redis 6.2. Updated the examples to use `ZRANGE` with `REV` and `BYSCORE`.
- The Python examples used `zrevrange`, `zrevrangebyscore`, and `zrangebyscore` where current redis-py supports `zrange(..., desc=True)` and `zrange(..., byscore=True)`. Updated those calls to the current `ZRANGE`-based API.
- The Node.js examples used `zrevrange` and `zrangebyscore`. Updated the ioredis calls to send `ZRANGE` with `REV` or `BYSCORE` options.
- The Go example used `ZRevRangeWithScores`, which go-redis documents alongside the deprecated Redis `ZREVRANGE` command path. Updated it to `ZRangeArgsWithScores` with `Rev: true`.
- The weekly leaderboard key used the calendar year (`date.year`) with an ISO week number, which is incorrect around year boundaries. Updated it to use the ISO week-year from `date.isocalendar()`.
- The Python `get_player_info` method could return `None` but was annotated as returning `Dict`. Updated the annotation to `Optional[Dict]`.
- The best-practices section recommended `ZRANGEBYSCORE` and `ZREVRANGE` directly. Updated the wording to recommend `ZRANGE with BYSCORE` and `ZRANGE with REV`.

## Review Notes
The rate limiter examples count every attempted request, including requests that are denied. That is a valid policy, but applications that want denied requests not to extend the window should conditionally add the request only when it is allowed, typically via a Lua script or transaction pattern.
