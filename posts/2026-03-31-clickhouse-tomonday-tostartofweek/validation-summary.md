# Validation Summary: How to Use toMonday() and toStartOfWeek() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, date functions, window functions, aggregate functions)

## Sources Consulted
- ClickHouse official documentation for `toMonday()`: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#tomonday
- ClickHouse official documentation for `toStartOfWeek()`: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#tostartofweek
- ClickHouse official documentation for window functions (`lagInFrame`): https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse official documentation for aggregate functions (`uniq`, `count`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- Python `datetime` module used to independently verify all day-of-week and date arithmetic claims

## Issues Found
No technical issues found.

## Review Notes
- All date examples were independently verified: March 31, 2026 is a Tuesday, March 30 is a Monday, and March 29 is a Sunday, matching all expected outputs in the post.
- The `toStartOfWeek()` mode values (0 = Sunday, 1 = Monday) are correct per ClickHouse documentation.
- The claim that `toMonday(dt)` and `toStartOfWeek(dt, 1)` produce identical results is accurate.
- The use of `lagInFrame()` rather than `lag()` is correct for ClickHouse window functions.
- All SQL syntax is valid ClickHouse SQL, including `today() - 90` (integer subtraction on Date types), `INTERVAL 7 DAY`, `USING (product_id)` join syntax, and `uniq()` for approximate distinct counts.
