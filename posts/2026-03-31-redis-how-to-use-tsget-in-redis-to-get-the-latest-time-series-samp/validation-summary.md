# Validation Summary: How to Use TS.GET in Redis to Get the Latest Time Series Sample

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisTimeSeries module (TS.GET, TS.ADD, TS.CREATE, TS.CREATERULE, TS.RANGE, TS.REVRANGE, TS.MGET)
- Python redis-py client library

## Sources Consulted
- Redis official documentation for TS.GET: https://redis.io/docs/latest/commands/ts.get/
- Redis official documentation for TS.CREATERULE: https://redis.io/docs/latest/commands/ts.createrule/
- Redis official documentation for TS.RANGE: https://redis.io/docs/latest/commands/ts.range/
- Redis official documentation for TS.REVRANGE: https://redis.io/docs/latest/commands/ts.revrange/
- redis-py Python client documentation for TimeSeries commands

## Issues Found
1. **Incorrect command in comparison table**: The table listed `TS.RANGE key - + COUNT N` for retrieving the "Latest N samples." `TS.RANGE` returns samples in chronological (oldest-first) order, so `COUNT N` would return the N oldest samples, not the latest. Changed to `TS.REVRANGE key - + COUNT N`, which returns samples in reverse chronological order, correctly yielding the N most recent samples.

## Review Notes
- The TS.GET syntax, LATEST flag behavior, return values, and empty series handling are all accurate per official Redis documentation.
- The TS.CREATERULE example correctly creates the destination key before establishing the rule.
- Python redis-py code examples use the correct `r.ts()` interface and method names (`add`, `get`, `create`).
- The `decode_responses=True` usage is compatible with the TimeSeries module in redis-py.
- The staleness check logic correctly converts between millisecond timestamps and seconds.
