# Validation Summary: How to Calculate Running Totals with Window Functions in PostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PostgreSQL
- SQL
- Window functions
- Aggregate functions
- Ranking functions

## Sources Consulted
- PostgreSQL 18 Documentation: Window Functions - https://www.postgresql.org/docs/current/functions-window.html
- PostgreSQL 18 Documentation: Window Functions Tutorial - https://www.postgresql.org/docs/current/tutorial-window.html
- PostgreSQL 18 Documentation: Value Expressions / Window Function Calls - https://www.postgresql.org/docs/current/sql-expressions.html
- PostgreSQL 18 Documentation: Mathematical Functions and Operators - https://www.postgresql.org/docs/current/functions-math.html

## Issues Found
- The post claimed window functions process data in a single pass and make queries faster. PostgreSQL documentation describes the semantics of window frames and aggregate window behavior, but execution may require ordering or other plan steps. I changed the wording to "single query" and "often more efficient" to avoid an over-broad performance guarantee.
- The first moving-average example was described as a "3-day moving average", but `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` over non-aggregated sales rows calculates a 3-row moving average. I changed the label to "3-row moving average" and clarified that daily aggregation is needed for a true 3-day moving average.
- The cumulative distribution example used `ROUND(CUME_DIST() * 100, 2)`. PostgreSQL documents `cume_dist()` as returning `double precision`, while the two-argument `round(v, s)` form is for `numeric`. I added an explicit `::numeric` cast before rounding to two decimal places.

## Review Notes
The sample `SUM(...) OVER (ORDER BY sale_date)` behavior with duplicate dates is correct because PostgreSQL's default frame with `ORDER BY` includes peers through the current row's last `ORDER BY` peer. The `LAST_VALUE` example correctly specifies an unbounded-following frame, avoiding the common default-frame pitfall.
