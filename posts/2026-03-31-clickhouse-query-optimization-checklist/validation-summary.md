# Validation Summary: ClickHouse Query Optimization Checklist

## Status
validated

## Post Type
Checklist / Reference Guide

## Technologies Covered
- ClickHouse (SQL dialect, system tables, query optimization features)
- ClickHouse system.query_log
- ClickHouse EXPLAIN PLAN
- ClickHouse aggregate functions (uniq, uniqExact, countIf)
- ClickHouse join algorithms (parallel_hash, grace_hash)
- ClickHouse SAMPLE clause
- ClickHouse query result cache

## Sources Consulted
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse EXPLAIN statement documentation: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse uniq() function documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse uniqHLL12() function documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqhll12
- ClickHouse SAMPLE clause documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/sample
- ClickHouse join algorithm documentation: https://clickhouse.com/blog/clickhouse-fully-supports-joins-how-to-choose-the-right-algorithm-part5

## Issues Found
1. **Incorrect description of `uniq()` algorithm and accuracy**: The post described `uniq()` as "HyperLogLog approximation, 99% accurate". This is incorrect on both counts. ClickHouse's `uniq()` function uses an adaptive sampling algorithm, not HyperLogLog. HyperLogLog is used by the separate `uniqHLL12()` function. The "99% accurate" claim is also not supported by official documentation. Changed the comment to "adaptive sampling approximation, much lower memory usage" which accurately reflects the function's behavior.

## Review Notes
- The `system.query_log` column names (`normalized_query_hash`, `query`, `query_duration_ms`, `read_rows`, `type`, `event_time`) are all correct.
- The `EXPLAIN indexes = 1` syntax is valid — when no subcommand is specified, `EXPLAIN` defaults to `EXPLAIN PLAN`, which accepts the `indexes` setting.
- The `join_algorithm` values `parallel_hash` and `grace_hash` are both valid ClickHouse settings.
- The SAMPLE example manually multiplies `uniq(user_id) * 100` to compensate for 1% sampling. This is the correct approach since ClickHouse does not automatically compensate aggregate function results when using SAMPLE. However, note that multiplying a cardinality estimate by the inverse sample factor is an approximation — it works well for `count()` but is less precise for distinct-count functions like `uniq()`.
- The partition pruning advice (matching `toYYYYMM()` exactly) is correct and practical.
