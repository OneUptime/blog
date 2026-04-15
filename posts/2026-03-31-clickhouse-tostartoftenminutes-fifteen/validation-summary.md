# Validation Summary: How to Use toStartOfTenMinutes() and toStartOfFifteenMinutes() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (date-time functions: `toStartOfTenMinutes`, `toStartOfFifteenMinutes`, `toStartOfMinute`, `toStartOfFiveMinutes`)
- ClickHouse aggregate function combinators (`countIf`)
- ClickHouse parametric aggregate functions (`quantile`)
- ClickHouse `WITH FILL` clause for gap-free time series
- ClickHouse `formatDateTime` function

## Sources Consulted
- ClickHouse Date-Time Functions documentation — https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse `formatDateTime` documentation — https://clickhouse.com/docs/sql-reference/functions/date-time-functions#formatdatetime
- ClickHouse Aggregate Function Combinators documentation — https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse `quantile` function documentation — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantile
- ClickHouse ORDER BY WITH FILL documentation — https://clickhouse.com/docs/sql-reference/statements/select/order-by
- ClickHouse GitHub PR #41910 (DateTime64 support for toStartOf* functions)

## Issues Found
1. **Incorrect `formatDateTime` specifier for minutes**: In the "Comparing 10-Minute Buckets Across Days" section, the query used `formatDateTime(bucket, '%H:%M')`. In ClickHouse's `formatDateTime`, `%M` is the format specifier for the **month** (01-12), not minutes. The correct specifier for minutes is `%i`. Changed `'%H:%M'` to `'%H:%i'`.

## Review Notes
- All four ClickHouse functions used (`toStartOfMinute`, `toStartOfFiveMinutes`, `toStartOfTenMinutes`, `toStartOfFifteenMinutes`) are confirmed to exist and work as described.
- The expected output values (14:20:00 for 10-minute bucketing and 14:15:00 for 15-minute bucketing of 14:22:47) are correct.
- `WITH FILL ... STEP INTERVAL N MINUTE` syntax is valid.
- `countIf(condition)` and `quantile(0.99)(expr)` are valid ClickHouse syntax.
- The `%M` vs `%i` gotcha is a common mistake because most other datetime formatting conventions (e.g., `strftime` in C/Python) use `%M` for minutes. ClickHouse follows MySQL's convention where `%i` is minutes and `%M` is the full month name.
