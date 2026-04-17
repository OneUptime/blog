# Validation Summary: How to Build Anti-Cheat Detection with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, window functions, parametric aggregate functions)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse MergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse data types (LowCardinality, DateTime64): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse window functions (lagInFrame): https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse `quantile` aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse `sumIf` / conditional aggregates: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse partitioning (`toYYYYMM`): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/custom-partitioning-key

## Issues Found
No technical issues found.

- `CREATE TABLE` uses valid ClickHouse types: `UUID`, `UInt64`, `UInt32`, `DateTime64(3)`, `LowCardinality(String)`, `Float32`, `UInt8`, `UInt16`. `MergeTree()` engine with `ORDER BY` and `PARTITION BY toYYYYMM(...)` is standard.
- `now() - INTERVAL 1 HOUR` is valid ClickHouse interval arithmetic.
- Parametric aggregate syntax `quantile(0.95)(accuracy_pct)` and `quantile(0.9999)(max_kills)` is correct.
- `lagInFrame(col) OVER w` with `WINDOW w AS (PARTITION BY ... ORDER BY ...)` is correct ClickHouse window syntax.
- `sumIf(1, predicate)` is a valid use of the `-If` combinator (equivalent to `countIf(predicate)`).
- `today() - N` returns a Date N days before today; comparison against a `DateTime64` column is handled via implicit conversion in ClickHouse.

## Review Notes
- `lagInFrame` returns the default value (0 for numeric types) for the first row of each partition, so the first event of each match will produce a large false displacement. In a production anti-cheat pipeline you would typically filter out the first row per partition (e.g., `lagInFrame(occurred_at) IS NOT NULL` or guard with a row-number check). This is a detection-logic consideration, not a SQL correctness issue.
- The `suspicious_signals` table is referenced but not defined. The inline comment acknowledges it is populated separately, which is reasonable for an illustrative example.
- `today() - 1` and `today() - 7` work via Date arithmetic; if sub-day precision matters, using `now() - INTERVAL N DAY` would be more explicit, but both are correct.
