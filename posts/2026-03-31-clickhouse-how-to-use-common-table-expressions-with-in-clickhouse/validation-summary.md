# Validation Summary: How to Use Common Table Expressions (WITH) in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL (Common Table Expressions / WITH clause)
- Recursive CTEs
- Window functions (used in one example)

## Sources Consulted
- [ClickHouse SELECT WITH Clause documentation](https://clickhouse.com/docs/sql-reference/statements/select/with)
- [ClickHouse Release 24.4 blog post](https://clickhouse.com/blog/clickhouse-release-24-04)
- [ClickHouse 2024 Changelog](https://clickhouse.com/docs/whats-new/changelog/2024)
- [ClickHouse PR #67587 — Fix creation of view with recursive CTE](https://github.com/ClickHouse/ClickHouse/pull/67587)

## Issues Found
- **Incorrect version for recursive CTE support**: The post originally stated that recursive CTEs were "added in 23.x". Recursive CTEs were actually introduced in ClickHouse 24.3 (highlighted in the 24.4 release blog). Updated the text to "added in 24.3".

## Review Notes
- The `WITH ... AS (SELECT ...)` named-subquery syntax and the scalar-CTE shorthand (`WITH expr AS alias`) are both valid in ClickHouse and correctly demonstrated.
- The claim that ClickHouse inlines CTEs (re-evaluating them on each reference) is accurate — this is a well-known behavior that differs from databases which materialize CTE results.
- The recursive CTE example uses the standard `UNION ALL` form with a base case and a recursive case referencing the CTE itself, consistent with ClickHouse's implementation.
- Multiple CTEs chained with commas, `CASE` expressions, window functions (`OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN ...)`), and aggregate functions (`count()`, `sum()`, `uniq()`, `avg()`, `max()`) are all used correctly for ClickHouse syntax.
- `INTERVAL 30 DAY`, `toDate()`, `today()`, and `now()` are all valid ClickHouse built-ins used appropriately.
- The temp-table workaround example uses `ENGINE = Memory`, which is a valid ClickHouse table engine for ephemeral in-memory data.
