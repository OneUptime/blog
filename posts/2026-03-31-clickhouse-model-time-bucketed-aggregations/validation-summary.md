# Validation Summary: How to Model Time-Bucketed Aggregations in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL dialect, aggregate functions, window functions, CTEs)
- ClickHouse time-bucketing functions (`toStartOfInterval`, `toStartOfMinute`, `toStartOfHour`, etc.)
- ClickHouse parameterized query syntax (`{name:Type}`)
- ClickHouse table functions (`numbers()`)
- ClickHouse aggregate combinators (`countIf`, `quantile`, `quantiles`)
- ClickHouse window functions (`OVER`, `ROWS BETWEEN`)

## Sources Consulted
- ClickHouse official documentation: Date/Time functions — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse official documentation: `toStartOfInterval` — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#tostartofinterval
- ClickHouse official documentation: Aggregate functions (`quantile`, `quantiles`, `countIf`) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse official documentation: Window functions — https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse official documentation: `numbers()` table function — https://clickhouse.com/docs/en/sql-reference/table-functions/numbers
- ClickHouse official documentation: `multiIf` function — https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions#multiif
- ClickHouse official documentation: `dateDiff` function — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- ClickHouse official documentation: Parameterized queries — https://clickhouse.com/docs/en/interfaces/cli#cli-queries-with-parameters

## Issues Found
No technical issues found.

## Review Notes
- The `coalesce` in the "Filling Empty Buckets" example is correct for standard SQL-compatible behavior (`join_use_nulls=1`). Without that setting, ClickHouse fills unmatched right-side JOIN columns with type defaults (0 for integers), making `coalesce` redundant but harmless. The code is portable and a good practice.
- `toStartOfWeek` defaults to Sunday as the start of the week (mode 0). The post doesn't mention the optional `mode` parameter, which is fine for a general guide.
- `toStartOfInterval` rounds relative to the Unix epoch (1970-01-01). An optional origin argument is available in newer ClickHouse versions for custom alignment, but the default behavior shown is standard and correct.
- The summary mentions "parameterized views" while the post demonstrates parameterized queries (`{interval:UInt32}`). These are closely related features and the term is reasonable in context.
- All array indexing for `quantiles()` results correctly uses 1-based indexing, which is ClickHouse's convention.
