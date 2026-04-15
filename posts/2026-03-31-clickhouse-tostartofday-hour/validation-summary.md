# Validation Summary: How to Use toStartOfDay() and toStartOfHour() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, date-time functions, aggregate functions, window functions)
- Time-series analytics patterns (bucketing, gap filling, SLO monitoring)

## Sources Consulted
- ClickHouse official documentation: date-time functions (`toStartOfDay`, `toStartOfHour`) — https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse official documentation: ORDER BY WITH FILL modifier — https://clickhouse.com/docs/en/sql-reference/statements/select/order-by#order-by-expr-with-fill-modifier
- ClickHouse official documentation: `lagInFrame` window function — https://clickhouse.com/docs/sql-reference/window-functions/lagInFrame
- ClickHouse official documentation: aggregate function combinators (`-If` suffix) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators#-if
- ClickHouse official documentation: `uniq` aggregate function — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse official documentation: `quantile` aggregate function — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile

## Issues Found
No technical issues found.

## Review Notes
- `toStartOfDay()` correctly documented as returning `DateTime` (not `Date`), which distinguishes it from `toStartOfMonth()` and `toStartOfYear()` that return `Date`.
- `lagInFrame()` is the correct ClickHouse-native window function (not standard SQL `lag()`). The usage with the default window frame (`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`) works correctly for accessing the previous row.
- All ClickHouse-specific syntax is correct: `countIf(condition)`, `uniq(column)`, `quantile(level)(expr)`, and `WITH FILL FROM ... TO ... STEP ...`.
- The division `countIf(...) / count()` in the error rate calculation correctly produces `Float64` in ClickHouse, so no explicit cast is needed.
- The `UNION ALL` query with a final `ORDER BY bucket` is valid ClickHouse syntax for ordering the combined result set.
