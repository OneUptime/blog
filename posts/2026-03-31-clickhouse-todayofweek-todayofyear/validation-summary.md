# Validation Summary: How to Use toDayOfWeek() and toDayOfYear() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- ClickHouse date-time functions: toDayOfWeek(), toDayOfYear(), toDate(), toYear(), today(), now(), concat(), toString()
- SQL aggregation patterns (GROUP BY, CASE, if())

## Sources Consulted
- ClickHouse official documentation for date-time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse source code for toDayOfWeek mode handling (toDayOfWeek.cpp)
- Calendar verification for 2026 dates (2026-03-30 = Monday, 2026-03-29 = Sunday, 2026 is not a leap year)

## Issues Found
1. **Incorrect toDayOfWeek() mode numbers (critical):** The post listed "Mode 1 (default)" for Monday=1...Sunday=7 and "Mode 3" for Monday=0...Sunday=6. The correct modes are Mode 0 (default) for Monday=1...Sunday=7 and Mode 1 for Monday=0...Sunday=6. Fixed the mode table and the accompanying prose ("mode 0 is used" instead of "mode 1 is used"). Note: the SQL examples themselves were unaffected because they call toDayOfWeek() without a mode argument, and the default mode 0 behavior matches the output shown.

## Review Notes
- All date calculations are correct: 2026-03-30 is indeed a Monday, 2026-03-29 is a Sunday, and toDayOfYear('2026-03-31') = 90 (31 + 28 + 31, since 2026 is not a leap year).
- All SQL syntax is valid ClickHouse SQL.
- The "Days Remaining" query uses `concat(toString(toYear(today())), '-12-31')` which works but could be simplified with `makeDate(toYear(today()), 12, 31)`. Not changed since the current approach is correct.
- The post only documents modes 0 and 1 and omits modes 2 (Sunday=0...Saturday=6) and 3 (Sunday=1...Saturday=7). This is acceptable since the post describes them as "the two most common modes."
