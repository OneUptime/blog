# Validation Summary: How to Store Time Series Data with Redis TimeSeries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis TimeSeries
- Redis Stack
- Redis 8 time series commands
- Docker
- Python
- redis-py

## Sources Consulted
- Redis TS.CREATE command documentation: https://redis.io/docs/latest/commands/ts.create/
- Redis TS.ADD command documentation: https://redis.io/docs/latest/commands/ts.add/
- Redis TS.RANGE command documentation: https://redis.io/docs/latest/commands/ts.range/
- Redis TS.MRANGE command documentation: https://redis.io/docs/latest/commands/ts.mrange/
- Redis TS.CREATERULE command documentation: https://redis.io/docs/latest/commands/ts.createrule/
- Redis TS.INCRBY command documentation: https://redis.io/docs/latest/commands/ts.incrby/
- Redis Stack Docker documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-stack/docker/
- RedisTimeSeries official repository: https://github.com/RedisTimeSeries/RedisTimeSeries

## Issues Found
- The setup section used the deprecated `redislabs/redistimeseries:latest` Docker image. Updated the examples to use the official `redis/redis-stack-server:latest` image and configured append-only persistence through `REDIS_ARGS`, matching Redis Stack Docker documentation.
- The setup text said Redis TimeSeries requires the RedisTimeSeries module. Updated it to note that Redis TimeSeries is available in Redis Stack and included in Redis 8 and later, matching the current RedisTimeSeries repository guidance.
- The `TS.MRANGE` example parsed labels but did not request them. Added `WITHLABELS`, because Redis returns an empty label array by default unless `WITHLABELS` or `SELECTED_LABELS` is specified.
- The `TS.MRANGE` parser treated labels as a flattened list. Updated it to convert Redis's label-value pair array with `dict(series[1])`.
- The metrics collector claimed to support histograms but only records timing samples. Updated the wording to "timing values."
- The counter implementation said to use `TS.INCRBY` but called `TS.ADD` without duplicate timestamp handling. Updated the `TS.ADD` call to use `ON_DUPLICATE SUM`, which is the documented way to sum duplicate timestamp counter samples when using `TS.ADD`.

## Review Notes
The examples use raw `execute_command` calls rather than redis-py's higher-level TimeSeries helper API. This is still technically valid, but future revisions could use the typed helper methods for clearer argument handling.
