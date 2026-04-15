# Validation Summary: How to Use toIntervalDay() and Interval Functions in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse SQL
- ClickHouse toInterval* function family (toIntervalSecond, toIntervalMinute, toIntervalHour, toIntervalDay, toIntervalWeek, toIntervalMonth, toIntervalQuarter, toIntervalYear)
- ClickHouse dateAdd / dateSub functions
- ClickHouse numbers() table function
- ClickHouse toMonday() function
- ClickHouse date/time arithmetic with Interval types

## Sources Consulted
- ClickHouse official documentation: Interval data type (https://clickhouse.com/docs/sql-reference/data-types/special-data-types/interval)
- ClickHouse official documentation: Date and time functions (https://clickhouse.com/docs/sql-reference/functions/date-time-functions)
- ClickHouse official documentation: numbers() table function (https://clickhouse.com/docs/sql-reference/table-functions/numbers)
- ClickHouse official documentation: dateAdd/dateSub functions (https://clickhouse.com/docs/sql-reference/functions/date-time-functions#dateadd)

## Issues Found
No technical issues found.

## Review Notes
- The `dateAdd(unit, value, date)` syntax used in the blog (e.g., `dateAdd(hour, 2, event_time)`) is correct. ClickHouse accepts unquoted interval type keywords (HOUR, DAY, MONTH, etc.) in this position.
- The sample output for the "Basic Usage" section is date-specific (assumes `today()` returns `2024-06-15`), which is expected for illustrative purposes. Readers running the query will get different dates.
- The "Combining Multiple Intervals" section shows chaining intervals sequentially onto a datetime value (e.g., `base + toIntervalMonth(1) + toIntervalDay(2) + toIntervalHour(6)`), which works correctly. Worth noting that ClickHouse evaluates these left-to-right, adding each interval to the running result, rather than combining them into a single composite interval. The blog's presentation is accurate for practical use.
- The distinction between `toIntervalDay(90)` and `toIntervalMonth(3)` is a valuable and correct note for readers.
