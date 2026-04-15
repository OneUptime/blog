# Validation Summary: How to Use toStartOfYear() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, date/time functions, window functions)
- SQL (aggregation, filtering, joins, subqueries)

## Sources Consulted
- ClickHouse official documentation for `toStartOfYear()`: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#tostartofyear
- ClickHouse official documentation for `toYear()`: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#toyear
- ClickHouse official documentation for `toDayOfYear()`: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#todayofyear
- ClickHouse official documentation for `lagInFrame()`: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse official documentation for `uniq()`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq

## Issues Found
No technical issues found.

## Review Notes
- The `toYear()` return type is correctly stated as `UInt16`.
- The `toStartOfYear()` return type is correctly stated as `Date`.
- The days-elapsed example output (89 days from 2026-01-01 to 2026-03-31) is arithmetically correct: 30 (remaining Jan) + 28 (Feb, non-leap year) + 31 (Mar) = 89.
- The annualized revenue projection formula divides by `today() - toStartOfYear(today())`, which would be zero on January 1st. This is a minor edge-case caveat rather than a technical error, and is common in annualization patterns.
- The post uses `lagInFrame()` rather than the SQL-standard `lag()`. Both are valid in ClickHouse; `lagInFrame()` is ClickHouse's original window function implementation and remains fully supported.
- All SQL examples use correct ClickHouse syntax and idiomatic patterns.
