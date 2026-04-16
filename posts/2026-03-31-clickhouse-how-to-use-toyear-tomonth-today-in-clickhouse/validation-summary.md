# Validation Summary: How to Use toYear(), toMonth(), toDay() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide for ClickHouse date extraction functions.

## Technologies Covered
- ClickHouse
- SQL (ClickHouse SQL dialect)
- ClickHouse date/time functions: `toYear`, `toMonth`, `toDayOfMonth`, `toDayOfWeek`, `toDayOfYear`, `toHour`, `toMinute`, `toSecond`, `toQuarter`, `toWeek`
- ClickHouse table engines: MergeTree
- ClickHouse data types: Date, DateTime, Nullable, LowCardinality, UInt8/UInt16/UInt32/UInt64, Float64

## Sources Consulted
- ClickHouse official docs — Date and Time Functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse source — `src/Functions/toDayOfMonth.cpp`: https://github.com/ClickHouse/ClickHouse/blob/master/src/Functions/toDayOfMonth.cpp
- ClickHouse source — `src/Functions/toDayOfYear.cpp`: https://github.com/ClickHouse/ClickHouse/blob/master/src/Functions/toDayOfYear.cpp
- ClickHouse source — `src/Functions/toCustomWeek.cpp` (toWeek implementation and mode table): https://github.com/ClickHouse/ClickHouse/blob/master/src/Functions/toCustomWeek.cpp
- ClickHouse source — `src/Functions/today.cpp`: https://github.com/ClickHouse/ClickHouse/blob/master/src/Functions/today.cpp
- ClickHouse source — `src/Functions/padString.cpp` (confirms `leftPad` is a valid function): https://github.com/ClickHouse/ClickHouse/blob/master/src/Functions/padString.cpp

## Issues Found

1. **`toDay()` is not a valid ClickHouse function.** The post used `toDay()` in the title, tags, description, reference table, a code example (`toDay(today()) AS day_of_month`), and the summary. ClickHouse exposes `toDayOfMonth()` for this purpose, with MySQL-compatibility aliases registered only as `DAY` and `DAYOFMONTH` (case-insensitive) — not `toDay`. Writing `toDay(...)` in a query returns an "unknown function" error.
   - Fix: Replaced all `toDay()` references with `toDayOfMonth()` (title, tags, description, table, basic-usage query, summary). Updated the table row to note the MySQL-compat `DAY` alias explicitly. Updated the table row's return-type note for consistency with other rows.

2. **Incorrect `toWeek('2024-03-15')` example output.** The table claimed `toWeek(2024-03-15)` returns `11`. With ClickHouse's default mode 0 (weeks start on Sunday; week 1 is the first week containing a Sunday in the current year), 2024-01-07 is the first Sunday, so week 1 = Jan 7–13, week 10 = Mar 10–16, and 2024-03-15 falls in week 10. The value 11 would only be produced under mode 1 (ISO-like).
   - Fix: Changed the output from `11` to `10` and updated the function signature to `toWeek(dt[, mode])` so the default-mode context is clear.

## Review Notes
- All other example outputs check out: `toDayOfWeek('2024-03-15') = 5` (Friday) is correct with Mon=1..Sun=7; `toDayOfYear('2024-03-15') = 75` is correct for the leap year 2024 (31 + 29 + 15); `toQuarter` for March is 1; `toHour`/`toMinute`/`toSecond` of `2024-03-15 14:30:00` = 14/30/0 are correct.
- `toDayOfYear` actually returns `UInt16` (not `UInt8`, which could not hold values up to 366). The post does not explicitly state a return type for `toDayOfYear`, so no fix was needed. Left unchanged to avoid scope creep.
- `toWeek` returns `UInt8` per the source, but the default-mode description in the docs says the range is 0–53 and the returned_value metadata says `UInt32` in newer docs; the post's "0–53" range is accurate for the default mode, so no change was required.
- `leftPad`, `dateDiff('minute', ...)`, `coalesce`, `isNotNull`, `countIf`, `round`, and `||` string concatenation used in the examples are all valid ClickHouse SQL.
- The `CREATE TABLE` DDL, `LowCardinality(String)`, `Nullable(DateTime)`, and `ENGINE = MergeTree() ORDER BY ...` syntax are all correct.
- Readers should be aware that `toDayOfWeek` has an optional `mode` argument that controls the starting day; the post uses default behavior (Mon=1..Sun=7), which matches the table.
