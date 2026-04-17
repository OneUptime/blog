# Validation Summary: How to Benchmark UDF Performance in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (system.query_log, system.trace_log, SQL UDFs, executable UDFs, executable_pool)
- clickhouse-benchmark CLI
- ClickHouse query profiler (`query_profiler_real_time_period_ns`)
- Shell / Python (for executable UDF scripts)

## Sources Consulted
- ClickHouse clickhouse-benchmark utility docs: https://clickhouse.com/docs/en/operations/utilities/clickhouse-benchmark
- ClickHouse SQL UDF docs: https://clickhouse.com/docs/en/sql-reference/functions/udf
- ClickHouse system tables docs (system.query_log, system.trace_log)
- ClickHouse executable UDF configuration (executable_pool type, pool_size)

## Issues Found
1. **Inaccurate claim about SQL UDF expansion timing.** The original post stated that SQL UDFs are "expanded at parse time". Per ClickHouse documentation, SQL UDFs are inlined into the query plan (during query planning), not at parse time. Updated the sentence to say they are "inlined into the query plan".
2. **Unrealistic `clickhouse-benchmark` sample output.** The original output block used a format (`Queries per second: 12.3`, `Mean query duration: 813ms`, `Percentiles: 50th=790ms, 95th=950ms, 99th=1100ms`) that does not match the actual tool's output. Replaced it with a representative block that matches the real format (`QPS`, `RPS`, and `N.000% X.XXX sec.` percentile rows).

## Review Notes
- `clickhouse-benchmark` flags (`-i` / `--iterations`, `--concurrency` / `-c`) are correct.
- `system.query_log` columns referenced (`query_duration_ms`, `read_rows`, `read_bytes`, `memory_usage`, `event_time`, `type`) and the `type = 'QueryFinish'` filter are valid.
- `system.trace_log` columns (`trace_type`, `query_id`) and `query_profiler_real_time_period_ns` setting are correct.
- `executable_pool` UDF config with `<type>`, `<pool_size>` is valid (though in practice this fragment lives inside a larger `<function>` element — the snippet is a documentation excerpt and acceptable).
- The `/var/lib/clickhouse/user_scripts/` path is the conventional location for executable UDF scripts.
- The CTR UDF example is logically consistent: `calcCtr(clicks, conversions)` with body `toFloat64(v)/toFloat64(c)` computes `conversions/clicks`, matching the inline expression.
