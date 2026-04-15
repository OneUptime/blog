# Validation Summary: How to Use yesterday() and tomorrow() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database / date-time functions)
- ClickHouse SQL dialect (yesterday(), tomorrow(), today(), toDate(), toDateTime(), toIntervalDay(), uniq(), count(), avg(), sum())

## Sources Consulted
- ClickHouse official documentation: Date-Time Functions (https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions)
- ClickHouse official documentation: Type Conversion Functions (https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions)
- ClickHouse official documentation: Aggregate Functions (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference)

## Issues Found
No technical issues found.

## Review Notes
- `yesterday()`, `today()`, and `tomorrow()` are all valid zero-argument ClickHouse functions returning `Date` type.
- The equivalence of `yesterday()` with `today() - 1` and `today() - toIntervalDay(1)` is correct. Integer subtraction from a `Date` subtracts that many days, and interval subtraction works analogously.
- The optimization advice about using explicit DateTime range predicates (`>= toDateTime(yesterday()) AND < toDateTime(today())`) instead of `toDate(column) = yesterday()` is accurate and valuable — wrapping a sort-key column in `toDate()` prevents ClickHouse from leveraging primary index range scans.
- All aggregate functions used (`count()`, `sum()`, `uniq()`, `avg()`) are valid ClickHouse functions with correct syntax.
- The `BETWEEN` usage with `Date` values in the rolling window query is correct.
- The `count() < 100000 AS below_threshold` expression is valid and returns a `UInt8` (boolean equivalent) in ClickHouse.
- The post correctly notes that these functions respect the server's local timezone setting.
