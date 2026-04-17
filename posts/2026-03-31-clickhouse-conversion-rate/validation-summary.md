# Validation Summary: How to Calculate Conversion Rate in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL)
- Aggregate function combinators (`-If`)
- `windowFunnel` aggregate function
- Window functions (`OVER ()`)

## Sources Consulted
- ClickHouse `uniq` documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse aggregate function combinators (`-If`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse `windowFunnel` documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/parametric-functions#windowfunnel
- ClickHouse `count` documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/count
- ClickHouse date/time functions (`today`, `toDate`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse window functions: https://clickhouse.com/docs/en/sql-reference/window-functions

## Issues Found
No technical issues found.

## Review Notes
- The `windowFunnel(window)(timestamp, cond1, cond2, ...)` signature with a parametric window in seconds is correct, and returns the maximum consecutive step reached by each user.
- `uniq` is approximate (HyperLogLog); for exact distinct counts `uniqExact` could be used, though the approximation is standard and intentional for performance in analytics use cases like this.
- `today() - 30` relies on implicit Date/DateTime arithmetic which ClickHouse supports; the comparison against `ts` works whether `ts` is Date or DateTime.
- The window function `max(count()) OVER ()` is valid and returns the maximum `count()` across all groups after the outer `GROUP BY level`, used here for normalizing percentages against the top funnel level.
- `HAVING visitors >= 100` correctly filters on the alias since ClickHouse allows aliases in `HAVING`.
