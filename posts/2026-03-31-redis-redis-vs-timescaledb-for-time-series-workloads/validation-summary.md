# Validation Summary: Redis vs TimescaleDB for Time-Series Workloads

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Redis (RedisTimeSeries module, Sorted Sets)
- TimescaleDB (hypertables, continuous aggregates, compression/retention policies)
- PostgreSQL (as the base for TimescaleDB)
- Python (redis-py, psycopg2 for hybrid architecture example)

## Sources Consulted
- RedisTimeSeries command reference: https://redis.io/docs/latest/develop/data-types/timeseries/
- Redis `TS.ADD` documentation: https://redis.io/commands/ts.add/
- Redis `TS.RANGE` documentation: https://redis.io/commands/ts.range/
- Redis `TS.CREATE` documentation: https://redis.io/commands/ts.create/
- Redis `TS.CREATERULE` documentation: https://redis.io/commands/ts.createrule/
- Redis `ZADD` / `ZRANGEBYSCORE` documentation: https://redis.io/commands/zadd/, https://redis.io/commands/zrangebyscore/
- Redis `redis-benchmark` documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/
- TimescaleDB `create_hypertable` documentation: https://docs.timescale.com/api/latest/hypertable/create_hypertable/
- TimescaleDB `time_bucket` documentation: https://docs.timescale.com/api/latest/hyperfunctions/time_bucket/
- TimescaleDB continuous aggregates: https://docs.timescale.com/timescaledb/latest/how-to-guides/continuous-aggregates/
- TimescaleDB compression: https://docs.timescale.com/api/latest/compression/
- TimescaleDB retention policies: https://docs.timescale.com/api/latest/data-retention/add_retention_policy/
- psycopg2 documentation: https://www.psycopg.org/docs/

## Issues Found
- **Incorrect `redis-benchmark` command (line 79-81):** The original command `redis-benchmark -t set -n 100000 -P 16` uses the `-t set` flag, which benchmarks the built-in `SET` command, not `TS.ADD`. The `-t` option only supports built-in Redis commands (ping, set, get, incr, lpush, etc.) and cannot target module commands like `TS.ADD`. Fixed by replacing with `redis-benchmark -n 100000 -P 16 TS.ADD testkey "*" 23.5`, which passes the arbitrary command directly to `redis-benchmark` and properly benchmarks the RedisTimeSeries `TS.ADD` operation. Also added a note that the RedisTimeSeries module must be loaded.

## Review Notes
- `ZRANGEBYSCORE` (line 42) has been considered deprecated since Redis 6.2.0 in favor of `ZRANGE ... BYSCORE`. It still works and is not removed, but new code should prefer the unified `ZRANGE` syntax. Left as-is since it remains functional and the post is not a Redis best-practices guide.
- The Python hybrid example calls `datetime.now()` twice (once for the Redis timestamp, once for the PostgreSQL insert), which could produce slightly different timestamps. This is a minor concern for a demonstration snippet and was left as-is.
- The Python example uses naive `datetime.now()` without timezone info when inserting into a `TIMESTAMPTZ` column. In practice, psycopg2 will interpret this using the session timezone, which works but is not ideal. Left as-is since this is illustrative code.
- "Redis on Flash" (line 143) refers to the Redis Enterprise feature now also known as "Auto Tiering." The term is still recognized and correct in context.
