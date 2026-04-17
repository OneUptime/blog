# Validation Summary: How to Audit and Optimize ClickHouse Resource Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, system tables, quotas)
- ClickHouse server configuration (config.xml)

## Sources Consulted
- ClickHouse CREATE QUOTA docs: https://clickhouse.com/docs/en/sql-reference/statements/create/quota
- system.merges docs: https://clickhouse.com/docs/en/operations/system-tables/merges
- system.metrics docs: https://clickhouse.com/docs/en/operations/system-tables/metrics
- system.parts docs: https://clickhouse.com/docs/en/operations/system-tables/parts
- system.columns docs: https://clickhouse.com/docs/en/operations/system-tables/columns
- system.query_log docs: https://clickhouse.com/docs/en/operations/system-tables/query_log
- Server configuration parameters: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse SQL syntax (alias scoping): https://clickhouse.com/docs/en/sql-reference/syntax

## Issues Found
1. **Invalid quota limit keyword.** `CREATE QUOTA ... MAX query_execution_time = 3600` used a non-existent keyword. The valid ClickHouse quota limit is `execution_time`. Changed `MAX query_execution_time` to `MAX execution_time`.
2. **Non-existent column in system.merges.** The query referenced `sum(rows)` on `system.merges`, but that table has no `rows` column — it has `rows_read` and `rows_written`. Changed `sum(rows)` to `sum(rows_read)`.
3. **Obsolete metric name in system.metrics.** `BackgroundPoolTask` has been removed in current ClickHouse versions in favor of more specific pool metrics. Replaced with `BackgroundMergesAndMutationsPoolTask`, which matches the merge/mutation context of the surrounding narrative.

## Review Notes
- Using a SELECT alias in `WHERE` (e.g., `WHERE compression_ratio < 2`) is a ClickHouse extension over standard SQL and is officially supported, though docs caution that alias/column-name collisions can produce unexpected substitution. Left as-is because it's idiomatic ClickHouse.
- `ProfileEvents['UserTimeMicroseconds']` is valid Map access on `system.query_log.ProfileEvents` (type `Map(String, UInt64)`).
- `background_pool_size` and `background_merges_mutations_concurrency_ratio` are both valid server-level config.xml settings.
- The `EXPLAIN` example demonstrates syntax but doesn't actually verify that "ORDER BY matches the query filter pattern" — readers may want `EXPLAIN indexes = 1` or `EXPLAIN SYNTAX` to get more useful output. Not changed since the narrative only asks the reader to inspect the plan.
