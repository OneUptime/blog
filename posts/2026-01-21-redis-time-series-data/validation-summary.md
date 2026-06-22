# Validation Summary: How to Store Time-Series Data in Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis sorted sets
- Redis Streams
- RedisTimeSeries
- Redis Stack Docker images
- Python redis-py
- Node.js ioredis
- Lua scripting in Redis

## Sources Consulted
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zrangebyscore/
- Redis XRANGE command documentation: https://redis.io/docs/latest/commands/xrange/
- Redis Streams documentation: https://redis.io/docs/latest/develop/data-types/streams/
- Redis time series data type documentation: https://redis.io/docs/latest/develop/data-types/timeseries/
- Redis TS.CREATE command documentation: https://redis.io/docs/latest/commands/ts.create/
- Redis TS.RANGE command documentation: https://redis.io/docs/latest/commands/ts.range/
- Redis TS.MRANGE command documentation: https://redis.io/docs/latest/commands/ts.mrange/
- Redis TS.CREATERULE command documentation: https://redis.io/docs/latest/commands/ts.createrule/
- Redis Stack Docker documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-stack/docker/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- ioredis API documentation: https://redis.github.io/ioredis/classes/Redis.html
- Docker Hub redislabs/redistimeseries image page: https://hub.docker.com/r/redislabs/redistimeseries

## Issues Found
- The sorted-set range examples used `ZRANGEBYSCORE` through redis-py and ioredis. Redis marks `ZRANGEBYSCORE` as deprecated as of Redis 6.2. Updated both examples to use `ZRANGE ... BYSCORE ... WITHSCORES`, and used redis-py's `zrange(..., byscore=True, withscores=True)` API.
- The Redis Streams Python example described an `XRANGE - + COUNT 50` query as "last 50 entries". `XRANGE` returns entries in ascending order from the start of the range, so this returns the first 50 entries. Updated the comment and variable/output text to say "first 50 entries".
- The RedisTimeSeries Docker installation command used the deprecated `redislabs/redistimeseries` image. Replaced it with the official Redis Stack server image and included the Redis Stack image with Redis Insight.
- The RedisTimeSeries compaction comment said downsampled series update automatically whenever data is added to the raw series. RedisTimeSeries compaction produces samples for completed buckets, so the comment now says completed buckets are compacted automatically.
- The Node.js RedisTimeSeries `createTimeSeries` helper always sent `LABELS`, even when no labels were provided. `TS.CREATE LABELS` requires label/value pairs, so the helper now appends `LABELS` only when labels are present.

## Review Notes
The post is technically relevant and the main approaches are accurate. RedisTimeSeries is now documented as part of Redis Open Source time series support in current Redis docs, while Redis Stack 7.x remains a valid documented Docker path for running the module-backed Stack distribution.
