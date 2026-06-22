# Validation Summary: How to Use RedisTimeSeries for Metrics Storage

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Redis
- RedisTimeSeries / Redis time series data type
- Redis Stack
- redis-py
- Python
- Docker
- Grafana Redis Data Source

## Sources Consulted
- Redis TS.ADD command documentation: https://redis.io/docs/latest/commands/ts.add/
- Redis TS.CREATE command documentation: https://redis.io/docs/latest/commands/ts.create/
- Redis TS.MADD command documentation: https://redis.io/docs/latest/commands/ts.madd/
- Redis TS.RANGE command documentation: https://redis.io/docs/latest/commands/ts.range/
- Redis TS.REVRANGE command documentation: https://redis.io/docs/latest/commands/ts.revrange/
- Redis TS.MRANGE command documentation: https://redis.io/docs/latest/commands/ts.mrange/
- Redis TS.MGET command documentation: https://redis.io/docs/latest/commands/ts.mget/
- Redis TS.CREATERULE command documentation: https://redis.io/docs/latest/commands/ts.createrule/
- redis-py RedisTimeSeries command documentation: https://redis.readthedocs.io/en/latest/redismodules.html
- redis-py exception documentation: https://redis.readthedocs.io/en/stable/exceptions.html
- RedisTimeSeries GitHub repository: https://github.com/RedisTimeSeries/RedisTimeSeries
- Grafana Redis Data Source plugin documentation: https://grafana.com/grafana/plugins/redis-datasource/

## Issues Found
- The standalone RedisTimeSeries build commands were outdated/incomplete for current guidance. Updated the section to note that Redis 8 includes time series natively, and corrected the standalone-module build flow to clone submodules and run `make setup` followed by `make build`.
- The `TS.MADD` Python example used keys that had not all been created and reused an existing timestamp for `metrics:cpu:server1`, which could fail under the default duplicate policy. Updated the example to create the additional series first and use a non-duplicate batch timestamp.
- The "last 100 points" example used `range("-", "+", count=100)`, which returns the first 100 points in forward order. Changed it to `revrange("-", "+", count=100)` so it actually returns the newest points first.
- The value-filter example used a non-existent redis-py argument `filter_by_value`. Replaced it with the documented `filter_by_min_value` and `filter_by_max_value` arguments.
- Several snippets caught `redis.ResponseError`, while redis-py documents the exception as `redis.exceptions.ResponseError`. Updated the examples accordingly.
- The application metrics example used the default duplicate policy for counters, which can fail when multiple requests share the same millisecond timestamp. Added duplicate policies so count series use `sum` and gauge-like series use `last`.
- The error-rate calculation used the first aggregation bucket only, which can undercount when Redis bucket alignment splits the requested window. Added explicit `align=start` and summed returned buckets.
- The alerting example used `json.dumps()` without importing `json`. Added the missing import.
- The threshold alert aggregation used a full-window bucket without explicit alignment, which could produce more than one bucket. Added `align=start` to match the intended window.

## Review Notes
- The latency percentile example is acceptable as a simple tutorial pattern, but high-throughput production systems should avoid relying on raw millisecond timestamp samples for precise request latency percentiles because duplicate timestamps may require a lossy duplicate policy. A histogram or sketch-based design would be more robust for that use case.
