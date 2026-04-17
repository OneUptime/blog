# Validation Summary: How to Use Date and Date32 Data Types in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL
- ClickHouse Date data type
- ClickHouse Date32 data type
- ClickHouse date/time conversion functions (toDate, toDate32)
- ClickHouse date extraction functions (toYear, toMonth, toDayOfMonth, toDayOfWeek, toWeek, toQuarter)
- ClickHouse date truncation functions (toStartOfMonth, toStartOfWeek)
- ClickHouse dateDiff function
- ClickHouse MergeTree engine

## Sources Consulted
- ClickHouse official documentation: Date data type — https://clickhouse.com/docs/en/sql-reference/data-types/date
- ClickHouse official documentation: Date32 data type — https://clickhouse.com/docs/en/sql-reference/data-types/date32
- ClickHouse official documentation: Type conversion functions — https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions
- ClickHouse official documentation: Functions for working with dates and times — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse official documentation: MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found
No technical issues found.

Verified:
- Date: UInt16-backed, 2 bytes, range 1970-01-01 to 2149-06-06 — correct.
- Date32: Int32-backed, 4 bytes, range 1900-01-01 to 2299-12-31 — correct.
- CREATE TABLE syntax with Date/Date32 columns and MergeTree engine — correct.
- String literal insertion in 'YYYY-MM-DD' format — correct.
- toDate() accepting strings, Unix timestamps (UInt32), and DateTime values — correct.
- toDate32() accepting strings and integers (days since Unix epoch, including negative values) — correct.
- Date arithmetic: Date ± integer yields Date; Date − Date yields days as integer — correct.
- dateDiff('day', date1, date2) syntax — correct.
- toDayOfWeek default mode returns 1=Monday through 7=Sunday — correct.
- toYear/toMonth/toDayOfMonth/toWeek/toQuarter function signatures — correct.
- toStartOfMonth/toStartOfWeek truncation functions — correct.
- Explicit casting recommendation for mixing Date and Date32 — reasonable and safe practice.

## Review Notes
- The Unix timestamp example `toDate(1743379200)` resolves to 2025-03-31 (not 2026-03-31), which is different from the neighboring string example `toDate('2026-03-31')`. These are independent examples and this is not a technical error, but readers may mistakenly expect them to produce the same result.
- Mixing Date and Date32 in expressions is handled more leniently in recent ClickHouse versions; explicit casting as shown remains the safest approach for cross-version compatibility.
- toDayOfWeek supports optional mode and timezone arguments (mode 0 is the default and matches the post's 1=Monday to 7=Sunday behavior).
