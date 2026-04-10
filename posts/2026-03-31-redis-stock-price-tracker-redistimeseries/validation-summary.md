# Validation Summary: How to Build a Stock Price Tracker with RedisTimeSeries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Stack Server (Docker image `redis/redis-stack-server`)
- RedisTimeSeries module (TS.CREATE, TS.ADD, TS.MADD, TS.RANGE, TS.GET, TS.CREATERULE)
- Python 3 with redis-py client library

## Sources Consulted
- RedisTimeSeries command reference: https://redis.io/docs/latest/develop/data-types/timeseries/
- TS.CREATE documentation: https://redis.io/commands/ts.create/
- TS.ADD documentation: https://redis.io/commands/ts.add/
- TS.MADD documentation: https://redis.io/commands/ts.madd/
- TS.RANGE documentation: https://redis.io/commands/ts.range/
- TS.GET documentation: https://redis.io/commands/ts.get/
- TS.CREATERULE documentation: https://redis.io/commands/ts.createrule/
- redis-py documentation: https://redis-py.readthedocs.io/
- Redis Stack Docker images: https://hub.docker.com/r/redis/redis-stack-server

## Issues Found

### 1. Misleading OHLC terminology (code comment and summary)
- **What was wrong:** The code comment on the compaction rules said "Create compaction rules for OHLC-like summaries" and the summary section referenced "compaction rules for OHLC bars." However, the code only creates `avg` (average) aggregation rules. True OHLC (Open, High, Low, Close) bars require four separate compaction rules per resolution using `first` (open), `max` (high), `min` (low), and `last` (close) aggregation types. A single `avg` compaction is not OHLC in any meaningful sense.
- **What was changed:** Changed "OHLC-like summaries" to "aggregated price summaries" in the code comment, and "compaction rules for OHLC bars" to "compaction rules for aggregated price bars" in the summary paragraph.
- **Why:** The original wording would mislead readers into thinking they have OHLC candlestick data when they only have average price bars.

## Review Notes
- The post uses `r.execute_command()` for all RedisTimeSeries operations. Since redis-py 4.x+, there is a native `r.ts()` API (e.g., `r.ts().create()`, `r.ts().add()`) that provides a more Pythonic interface with proper argument typing. The `execute_command` approach still works and is not deprecated, but readers may benefit from knowing about the native API.
- The `get_moving_average` function computes bucketed averages over fixed time windows, which is conceptually different from a traditional Simple Moving Average (SMA) or Exponential Moving Average (EMA). The description is acceptable for a tutorial context, but readers building production trading systems should be aware of the distinction.
- The `record_tick` function uses `timestamp_ms or int(time.time() * 1000)` — if `timestamp_ms` were explicitly `0`, it would fall through to auto-timestamp. This is unlikely in practice but worth noting. Alternatively, TS.ADD supports `*` as the timestamp for server-side auto-timestamping.
