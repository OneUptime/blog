# Validation Summary: How to Use IS NULL and IS NOT NULL in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- Nullable column types
- IS NULL / IS NOT NULL operators
- `isNull` / `isNotNull` functions
- `coalesce` / `ifNull` functions
- Aggregate functions (`count`, `countIf`, `avg`)

## Sources Consulted
- ClickHouse docs — Nullable data type: https://clickhouse.com/docs/en/sql-reference/data-types/nullable
- ClickHouse docs — Functions for working with Nullable values: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls
- ClickHouse docs — Operators (IS NULL / IS NOT NULL): https://clickhouse.com/docs/en/sql-reference/operators
- ClickHouse docs — `coalesce`, `ifNull`: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls
- ClickHouse docs — Aggregate function combinators (`-If`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse docs — `count` / `avg` NULL handling: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/count

## Issues Found
No technical issues found.

Verified claims:
- Columns are non-nullable by default; `Nullable(T)` wrapper required — correct.
- `CREATE TABLE ... ENGINE = MergeTree() ORDER BY user_id` is valid syntax.
- `IS NULL` / `IS NOT NULL` are supported operators in ClickHouse.
- `x = NULL` evaluates to NULL (unknown), so no rows match in a WHERE clause — correct.
- `isNull(x)` and `isNotNull(x)` return `UInt8` (0 or 1) — matches ClickHouse docs.
- Aggregate functions like `avg`, `sum` skip NULLs; `count()` counts all rows — behavior described is correct.
- `countIf(condition)` counts rows where the UInt8 condition is non-zero — correct usage.
- `coalesce(x, y, ...)` returns the first non-NULL argument — correct.
- `ifNull(x, alt)` returns `alt` when `x` is NULL — correct; equivalent to `coalesce` for two args.

## Review Notes
- The comment "This returns 0 rows - always false" for `WHERE phone = NULL` is slightly imprecise: the expression evaluates to NULL, not false, but WHERE treats NULL as non-matching, so the observable behavior (0 rows) is correct. The surrounding prose already explains this correctly, so no change was needed.
- The post does not mention the `LowCardinality(Nullable(T))` combination or `assumeNotNull` / `toNullable` casting functions, which could be useful additions in a future revision but are out of scope for this post.
