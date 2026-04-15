# Validation Summary: How to Calculate Percentages and Ratios in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse SQL
- ClickHouse window functions (`OVER`, `PARTITION BY`, `lag`)
- ClickHouse conditional aggregation (`countIf`)
- ClickHouse date/time functions (`toDate`, `toStartOfHour`, `toYYYYMM`, `today()`, `now()`)
- ClickHouse safe division pattern (`nullIf`)

## Sources Consulted
- ClickHouse documentation: Aggregate Function Combinators (`countIf`) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse documentation: Window Functions — https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation: Arithmetic operators (division returns Float64 for integer types) — https://clickhouse.com/docs/en/sql-reference/operators#arithmetic
- ClickHouse documentation: `nullIf` function — https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions#nullif
- ClickHouse documentation: `round` function — https://clickhouse.com/docs/en/sql-reference/functions/rounding-functions#round
- ClickHouse documentation: Date/time functions (`toDate`, `toStartOfHour`, `toYYYYMM`, `today`, `now`) — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation: `lag` window function — https://clickhouse.com/docs/en/sql-reference/window-functions#lag

## Issues Found
No technical issues found.

## Review Notes
- All six SQL examples use valid ClickHouse syntax and produce correct results.
- The post correctly relies on ClickHouse's behavior where `/` on integer types returns `Float64`, avoiding the need for explicit casts to floating-point before division.
- The `nullIf(..., 0)` pattern is appropriately used for safe division wherever the denominator could plausibly be zero. In the Error Rate example, `count()` is used as the denominator without `nullIf`, which is correct since `count()` within a GROUP BY group is always >= 1.
- The `sum(sum(revenue)) OVER ()` pattern (nested aggregate inside a window function) is valid in ClickHouse and is a clean way to compute share-of-total in a single query.
- Window function `lag()` with an aggregate argument in a GROUP BY query is valid ClickHouse syntax, as window functions are evaluated after aggregation.
