# Validation Summary: How to Build a Data Quality Monitoring System with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, LowCardinality types, CTEs, date/time functions)
- Bash (alerting script)
- clickhouse-client CLI
- curl (webhook delivery)

## Sources Consulted
- [ClickHouse WITH Clause documentation](https://clickhouse.com/docs/sql-reference/statements/select/with)
- [ClickHouse INSERT INTO documentation](https://clickhouse.com/docs/en/sql-reference/statements/insert-into)
- [ClickHouse GitHub Issue #30323 — CTE before INSERT not supported](https://github.com/ClickHouse/ClickHouse/issues/30323)
- [ClickHouse GitHub Issue #38053 — SQL compatibility: CTE for INSERTs](https://github.com/ClickHouse/ClickHouse/issues/38053)
- ClickHouse documentation for `MergeTree`, `LowCardinality`, `dateDiff`, `today()`, `countIf`, and `INTERVAL` syntax

## Issues Found
1. **Volume Check — invalid CTE placement.** The original query used `WITH ... INSERT INTO ... SELECT ...`, which is the standard SQL form but is **not supported** by ClickHouse. ClickHouse requires the `WITH` clause to come *after* `INSERT INTO`, i.e. `INSERT INTO table WITH cte AS (...) SELECT ...`. As written, the query would fail with a syntax error. Fixed by moving the `WITH` clause after `INSERT INTO data_quality_results`.

2. **Volume Check — incorrect 7-day window.** The previous filter `event_time BETWEEN today() - 7 AND today() - 1` mixes `DateTime` with `Date` boundaries; `today() - 1` is implicitly converted to midnight of yesterday, so events occurring during yesterday are almost entirely excluded. This makes the "7-day average" effectively a 6-day average. Replaced with `event_time >= today() - 7 AND event_time < today()`, which captures exactly the previous 7 full days.

## Review Notes
- The use of column aliases in subsequent expressions of the same `SELECT` (e.g. referring to `null_rate` after defining it) is a ClickHouse-supported feature and is correct.
- The Null Rate Check uses `countIf(user_id = 0)` to approximate "null or empty" — this only works if `user_id` is a non-Nullable integer where `0` is treated as the absence of a value. For truly Nullable columns, `countIf(isNull(col))` would be more accurate. The post's framing is fine for the typical denormalized event-table pattern but readers with Nullable columns should adapt accordingly.
- The bash alerting script relies on `clickhouse-client --query` returning a single integer; command substitution strips the trailing newline so the `[ -gt ]` test works correctly.
- The `passed` column is `UInt8`, and ClickHouse comparison expressions naturally return `UInt8` (0/1), so the inserts are type-compatible.
- Partitioning by `toYYYYMM(check_time)` and ordering by `(table_name, check_name, check_time)` is a sensible MergeTree layout for the described access patterns.
