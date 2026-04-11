# Validation Summary: How to Use TS.MRANGE in Redis to Query Multiple Time Series

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisTimeSeries module (TS.MRANGE, TS.CREATE, TS.MADD)
- redis-py Python client library

## Sources Consulted
- Redis official documentation for TS.MRANGE: https://redis.io/docs/latest/commands/ts.mrange/
- Redis official documentation for TS.CREATE: https://redis.io/docs/latest/commands/ts.create/
- Redis official documentation for TS.MADD: https://redis.io/docs/latest/commands/ts.madd/
- redis-py library documentation for TimeSeries methods

## Issues Found
1. **Syntax block had incorrect parameter ordering**: `GROUPBY label REDUCE reducer` was placed before `FILTER filterExpr`, but the official Redis documentation specifies that `FILTER` must come before `GROUPBY REDUCE`. Also, `ALIGN` was listed as a standalone optional clause, but it is actually tied to the `AGGREGATION` clause (i.e., `[ALIGN align]` is only valid when `AGGREGATION` is present). Fixed the syntax block to match the official documentation.

2. **Missing `RANGE` reducer**: The list of available reducers for `GROUPBY REDUCE` was missing `RANGE` (computes max - min, available since RedisTimeSeries 1.8). Added it to the list.

3. **Unused `defaultdict` import**: The first Python example imported `defaultdict` from the `collections` module but never used it. Removed the unused import.

## Review Notes
- The Python examples use correct redis-py API method signatures and parameter names (`filters`, `with_labels`, `aggregation_type`, `bucket_size_msec`, `groupby`, `reduce`).
- The CLI examples correctly demonstrate label filter expressions including equality (`=`), inequality (`!=`), and set membership (`=(v1,v2)`) syntax.
- The comparison table between TS.RANGE and TS.MRANGE is accurate.
- Redis 8.6 introduced additional reducers (`countNaN`, `countAll`) not listed in this post; these are very recent additions and their omission is acceptable for a general tutorial.
