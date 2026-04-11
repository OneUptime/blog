# Validation Summary: How to Use TS.MREVRANGE in Redis for Reverse Multi-Key Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisTimeSeries module
- TS.MREVRANGE command
- Python redis-py client (`redis.Redis`, `r.ts()`)

## Sources Consulted
- Redis official documentation for TS.MREVRANGE: https://redis.io/docs/latest/commands/ts.mrevrange/
- Redis TimeSeries data type documentation: https://redis.io/docs/latest/develop/data-types/timeseries/
- redis-py source code for `ts.mrevrange()` method signature

## Issues Found

1. **Syntax block: GROUPBY and FILTER in wrong order (lines 26-29)** - The syntax block showed `GROUPBY` before `FILTER`. Per official Redis docs, `FILTER` must come before the optional `GROUPBY` clause. Fixed by swapping the order.

2. **Syntax block: ALIGN not coupled with AGGREGATION** - The syntax showed `[ALIGN align]` on its own line separate from `AGGREGATION`. Per official docs, `ALIGN` is part of the aggregation block: `[[ALIGN align] AGGREGATION ...]`. Fixed to match official syntax.

3. **"With Labels" example: SELECTED_LABELS and WITHLABELS used together (line 84)** - The command `TS.MREVRANGE - + SELECTED_LABELS host WITHLABELS FILTER metric=cpu COUNT 3` used both `SELECTED_LABELS` and `WITHLABELS`, which are mutually exclusive options. Fixed to use only `WITHLABELS`.

4. **"With Labels" example: COUNT placed after FILTER (line 84)** - `COUNT 3` appeared after `FILTER metric=cpu`, violating the required parameter ordering. Fixed to place `COUNT 3` before `FILTER`.

## Review Notes
- All Python code examples correctly use the redis-py `ts.mrevrange()` API with valid parameter names and types.
- The comparison table between TS.MREVRANGE and TS.MRANGE is accurate.
- The claim that TS.MREVRANGE is "the most efficient way to get the latest N samples from a fleet of time series" is a reasonable characterization, though technically it depends on the use case and data volume.
