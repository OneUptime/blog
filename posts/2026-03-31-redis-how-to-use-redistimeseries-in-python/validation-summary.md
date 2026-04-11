# Validation Summary: How to Use RedisTimeSeries in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Stack (with RedisTimeSeries module)
- Python (redis-py client library, >= 4.4)
- Docker (for running Redis Stack)
- psutil (for system metrics collection example)

## Sources Consulted
- redis-py source code (v7.0.1), specifically `redis/commands/timeseries/commands.py` and `redis/commands/timeseries/utils.py` — verified all method signatures, parameter names, and return types
- Redis TimeSeries command reference: https://redis.io/commands/?group=timeseries
- redis-py PyPI package documentation: https://pypi.org/project/redis/
- Docker Hub redis/redis-stack image: https://hub.docker.com/r/redis/redis-stack

## Issues Found
1. **Incorrect `mget()` return value destructuring** — The "Querying Multiple Series with Labels" section used `for series_key, labels, data_point in results` to unpack `mget()` results. However, `parse_m_get()` in redis-py returns a list of single-key dictionaries (`[{key: [labels_dict, timestamp, value]}, ...]`), not a list of tuples. Fixed by iterating over dict items: `for item in results: for series_key, values in item.items()`.

2. **Missing `psutil` installation instruction** — The "Practical Metrics Collection Example" section imports `psutil` but did not include a `pip install psutil` command. Readers following the tutorial sequentially would encounter a `ModuleNotFoundError`. Added the install command before the code block.

## Review Notes
- All other API calls (`ts().create()`, `ts().add()`, `ts().madd()`, `ts().range()`, `ts().get()`, `ts().createrule()`) were verified against redis-py 7.0.1 source — parameter names (`retention_msecs`, `labels`, `duplicate_policy`, `from_time`, `to_time`, `aggregation_type`, `bucket_size_msec`, `source_key`, `dest_key`) all match exactly.
- The use of `'*'` as auto-timestamp in `ts().add()` is confirmed valid — the parameter is typed `Union[int, str]`.
- All retention math calculations are correct (e.g., `7 * 24 * 60 * 60 * 1000` = 604800000 ms = 7 days).
- The Docker image `redis/redis-stack:latest` correctly includes the RedisTimeSeries module.
- The `decode_responses=True` flag is used consistently, which is appropriate for this tutorial.
