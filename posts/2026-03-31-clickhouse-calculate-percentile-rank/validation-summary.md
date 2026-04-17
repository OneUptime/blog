# Validation Summary: How to Calculate Percentile Rank in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse SQL
- Window functions: `percent_rank()`, `rank()`, `ntile()`
- Aggregate function: `quantile(p)(column)`
- `-If` combinator: `countIf()`
- MergeTree table engine

## Sources Consulted
- ClickHouse Window Functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse `quantile` aggregate: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse aggregate combinators (`-If`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse `count`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/count
- ClickHouse JOIN: https://clickhouse.com/docs/en/sql-reference/statements/select/join

## Issues Found
No technical issues found.

- `percent_rank()` behavior description (0 for lowest, 1 for highest) matches the SQL-standard formula `(rank - 1) / (total_rows - 1)` that ClickHouse implements.
- `rank()` arithmetic for percentile in Method 2 is correct.
- Self-join percentile pattern in Method 3 is valid and produces the "percent of values at or below" definition stated in the intro.
- `ntile(N)` bucket assignment semantics are correct.
- `quantile(0.25)(score)` uses correct ClickHouse parametric aggregate syntax.
- `countIf(condition)` is valid via the `-If` combinator.
- `PARTITION BY ... ORDER BY` window clauses are supported.

## Review Notes
- The self-join approach in Method 3 works but is memory-bound in ClickHouse (the right side is hashed). For very large tables, the window-function approaches (Methods 1 and 2) are generally preferred for performance.
- The intro defines percentile rank as "percentage of values at or below", which is the inclusive definition (matches Method 3). `percent_rank()` (Method 1) uses the SQL-standard exclusive formula, so the lowest value returns 0 rather than a non-zero inclusive percentile — the post explicitly calls this out, which is accurate.
