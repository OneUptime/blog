# Validation Summary: How to Build a Metrics Pipeline with Redis

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis Streams
- RedisTimeSeries
- Redis sorted sets
- redis-py
- redis.asyncio
- ioredis
- Python
- Node.js
- Flask
- Express

## Sources Consulted
- Redis Streams documentation and XADD command reference: https://redis.io/docs/latest/develop/data-types/streams/ and https://redis.io/docs/latest/commands/xadd/
- Redis TS.CREATE, TS.RANGE, TS.MRANGE, and TS.QUERYINDEX command references: https://redis.io/docs/latest/commands/ts.create/, https://redis.io/docs/latest/commands/ts.range/, https://redis.io/docs/latest/commands/ts.mrange/, and https://redis.io/docs/latest/commands/ts.queryindex/
- RedisTimeSeries overview: https://redis.io/docs/latest/develop/data-types/timeseries/
- redis-py command and RedisTimeSeries documentation: https://redis.readthedocs.io/en/stable/commands.html, https://redis.readthedocs.io/en/stable/examples/timeseries_examples.html, and https://redis.readthedocs.io/en/latest/redismodules.html
- redis-py asyncio documentation: https://redis.readthedocs.io/en/stable/examples/asyncio_examples.html and https://redis.io/docs/latest/develop/clients/redis-py/async/
- ioredis documentation and repository: https://github.com/redis/ioredis and https://redis.github.io/ioredis/

## Issues Found
- The Node.js collection client defined both `this.buffer` and a `buffer()` method. The instance property shadows the method, so `collector.buffer(...)` would fail. Renamed the array to `bufferedMetrics` and updated `flush()` accordingly.
- The Node.js `stopAutoFlush()` method called the async `flush()` without awaiting it. Changed the method to `async` and awaited the final flush.
- The RedisTimeSeries example inserted many samples with the server timestamp `*` in a tight loop. Because RedisTimeSeries blocks duplicate timestamps by default, this could fail when multiple samples landed in the same millisecond. Updated the example to pass explicit increasing timestamps.
- The RedisTimeSeries examples did not create labels that could support the query examples. Added `metric_type=metric` and `metric_name=<name>` labels when creating series.
- The Python query service built RedisTimeSeries filter expressions as one space-joined string. `TS.MRANGE` and `TS.QUERYINDEX` expect separate filter expressions. Updated the code to pass a list of filters.
- The default `list_metrics()` query used `__name__!=`, which is not a valid way to list all RedisTimeSeries keys and does not satisfy the documented requirement for an equality filter. Changed it to query the explicit `metric_type=metric` label.
- The Flask query API used `time.time()` without importing `time`. Added the missing import.
- The complete async Python example used the old standalone `aioredis` import. Updated it to the current `redis.asyncio` API and replaced `close()` with `aclose()`.
- The complete async Python example parsed sorted-set members as strings but did not request decoded Redis responses. Added `decode_responses=True` to the async Redis client.
- The async auto-flush task was cancelled without awaiting cancellation. Added handling for `asyncio.CancelledError`.

## Review Notes
The reviewed examples are syntactically valid after the fixes. The post assumes RedisTimeSeries is available in the Redis deployment; Redis Open Source installations without the TimeSeries module or Redis Stack will not support `TS.*` commands.
