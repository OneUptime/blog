# Validation Summary: How to Fill Gaps in Time-Series Data with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse SQL
- `WITH FILL` / `INTERPOLATE` / `ORDER BY` modifiers
- `numbers()` table function for time spines
- Date/DateTime functions: `toStartOfMinute`, `toDateTime`, `toDate`, `today`, `now`
- Window functions (`last_value`)

## Sources Consulted
- ClickHouse docs — ORDER BY / WITH FILL / INTERPOLATE: https://clickhouse.com/docs/sql-reference/statements/select/order-by
- ClickHouse docs — Date and time functions (toStartOfMinute, today, now): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse docs — numbers() table function: https://clickhouse.com/docs/sql-reference/table-functions/numbers

## Issues Found
- **Section "Filling with a Default Value" — broken carry-forward example.** The original code used `coalesce(events, last_value(events) OVER (ORDER BY minute))` to carry forward the last known value. This does not work in ClickHouse: `WITH FILL` fills missing rows with the column's default value (0 for `count()`'s `UInt64`), not `NULL`, so `coalesce(events, ...)` always returns 0 and never falls through to `last_value`. Additionally, `last_value(events) OVER (ORDER BY minute)` with the default frame returns the current row's value, not the most recent prior value. Replaced the example with the idiomatic `INTERPOLATE (events AS events)` clause on the `WITH FILL` order, which repeats the previous row's value for generated rows — the documented way to do last-value carry-forward in ClickHouse. Updated the accompanying prose and the Summary's mention of "window functions for last-value-carried-forward" to reference `INTERPOLATE` instead.

## Review Notes
- The multi-series example (`ORDER BY service, minute WITH FILL ...`) relies on ClickHouse filling per sort-prefix, which is the default behavior (`use_with_fill_by_sorting_prefix = 1`, default in modern versions). Worth noting for readers running very old versions, but not incorrect as written.
- `today() - 30` relies on `Date - Int` arithmetic (days), which is supported in ClickHouse. The section header calls it a "weekly report" while the range is 30 days — cosmetic mismatch, not a technical error.
- `STEP INTERVAL 1 DAY` / `STEP INTERVAL 1 MINUTE` are valid because ClickHouse allows `INTERVAL` in `STEP` for Date/DateTime columns.
- The time spine example using `numbers(1440)` correctly generates one full day of per-minute rows.
