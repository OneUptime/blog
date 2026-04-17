# Validation Summary: How to Use CROSS JOIN in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL (CROSS JOIN, INNER JOIN, CTEs, scalar subqueries)
- ClickHouse-specific functions (arrayJoin, arrayMap, addDays, range, toDate, avg, now, INTERVAL)

## Sources Consulted
- ClickHouse SELECT JOIN docs: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse Date type docs: https://clickhouse.com/docs/en/sql-reference/data-types/date
- ClickHouse Date/Time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse Operators: https://clickhouse.com/docs/en/sql-reference/operators/
- ClickHouse WITH / CTE docs: https://clickhouse.com/docs/en/sql-reference/statements/select/with
- ClickHouse `cross_to_inner_join_rewrite` setting reference

## Issues Found
- **Date arithmetic using `+` operator on Date type**: In the "Real-World Example — Daily Metric Baseline" section, the original code used `toDate('2024-01-01') + x` inside `arrayMap`. Direct `Date + Integer` arithmetic is not a clearly documented operation in ClickHouse, and the idiomatic/supported way is to use the `addDays()` function. Changed `arrayMap(x -> toDate('2024-01-01') + x, range(30))` to `arrayMap(x -> addDays(toDate('2024-01-01'), x), range(30))` to guarantee correctness against official docs.

## Review Notes
- CROSS JOIN syntax, comma-separated FROM syntax, and the `CROSS JOIN + WHERE = INNER JOIN` rewrite behavior (controlled by `cross_to_inner_join_rewrite`) are all accurately described.
- CTE `WITH name AS (SELECT ...)` syntax and referencing the CTE in a CROSS JOIN is supported and correct.
- `arrayJoin`, `arrayMap`, `range`, and `INTERVAL 1 HOUR` are all used correctly.
- The performance warning and guidance on preferring explicit INNER JOIN when a filter references both sides is accurate and aligns with ClickHouse's optimizer behavior.
- Alternative date-range generation approaches (e.g., `numbers()` table function with `dateAdd`) exist but the current approach with `addDays` is correct.
