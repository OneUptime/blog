# Validation Summary: How to Build a System Metrics Dashboard with RedisTimeSeries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Stack (redis/redis-stack-server Docker image)
- RedisTimeSeries module (TS.CREATE, TS.CREATERULE, TS.MADD, TS.RANGE, TS.GET, TS.MGET)
- Python redis-py client library
- Python psutil library for system metrics collection
- Docker

## Sources Consulted
- Redis TS.MGET command documentation: https://redis.io/docs/latest/commands/ts.mget/
- Redis TS.CREATE command documentation: https://redis.io/docs/latest/commands/ts.create/
- Redis TS.CREATERULE command documentation: https://redis.io/docs/latest/commands/ts.createrule/
- Redis TS.MADD command documentation: https://redis.io/docs/latest/commands/ts.madd/
- Redis TS.RANGE command documentation: https://redis.io/docs/latest/commands/ts.range/
- Redis TS.GET command documentation: https://redis.io/docs/latest/commands/ts.get/
- redis-py TimeSeries examples: https://redis.readthedocs.io/en/v6.0.0/examples/timeseries_examples.html
- psutil documentation: https://psutil.readthedocs.io/

## Issues Found

### 1. Missing WITHLABELS in TS.MGET command
- **What was wrong:** In the `get_all_hosts_current` function, the `TS.MGET` command was called without the `WITHLABELS` option. Without this option, `TS.MGET` returns an empty array for labels, making the subsequent label parsing code ineffective. The `labels.get('host', key)` call would always fall back to the raw Redis key instead of the actual hostname.
- **What was changed:** Added `'WITHLABELS'` argument to the `TS.MGET` command: `r.execute_command('TS.MGET', 'WITHLABELS', 'FILTER', ...)`.
- **Why:** The WITHLABELS option is required for RedisTimeSeries to include label key-value pairs in the response, which the code depends on for extracting the host name.

### 2. Incorrect label parsing logic for TS.MGET response
- **What was wrong:** The label parsing code `dict(zip(item[1][0::2], item[1][1::2]))` assumed labels are returned as a flat list like `['key1', 'val1', 'key2', 'val2']`. However, TS.MGET with WITHLABELS returns labels as nested pairs: `[['key1', 'val1'], ['key2', 'val2']]`. The slice-based approach would produce incorrect results and raise a TypeError (lists are not hashable) with 2+ label pairs.
- **What was changed:** Replaced `dict(zip(item[1][0::2], item[1][1::2]))` with `dict(item[1])`, which correctly converts the list of two-element lists into a dictionary.
- **Why:** Python's `dict()` constructor natively accepts an iterable of key-value pairs, which matches the nested pair format returned by RedisTimeSeries.

## Review Notes
- The `psutil.cpu_percent(interval=1)` call blocks for 1 second to measure CPU usage. The timestamp is captured before this call, so there is a ~1 second discrepancy between the recorded timestamp and the actual CPU measurement. This is acceptable for a tutorial but worth noting for production use.
- All other RedisTimeSeries commands (TS.CREATE, TS.CREATERULE, TS.MADD, TS.RANGE, TS.GET) are used with correct syntax and valid parameter values.
- The retention values (86400000ms = 1 day, 30*86400000ms = 30 days) and aggregation bucket (300000ms = 5 minutes) are correctly calculated.
- The Docker image `redis/redis-stack-server:latest` is the correct image that includes RedisTimeSeries.
