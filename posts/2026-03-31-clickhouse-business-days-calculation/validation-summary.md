# Validation Summary: How to Calculate Business Days Between Dates in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse date/time functions (`toDayOfWeek`, `toMonday`, `dateDiff`, `today`, `toIntervalDay`, `toDate`)
- ClickHouse array functions (`arrayFilter`, `arrayMap`, `arrayElement`, `range`)
- ClickHouse table functions (`numbers`)
- ClickHouse conditional aggregation (`countIf`)

## Sources Consulted
- ClickHouse Date/Time Functions — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse Array Functions — https://clickhouse.com/docs/sql-reference/functions/array-functions
- ClickHouse Interval data type — https://clickhouse.com/docs/sql-reference/data-types/special-data-types/interval
- ClickHouse Arithmetic Functions (`intDiv`, `least`) — https://clickhouse.com/docs/sql-reference/functions/arithmetic-functions
- ClickHouse `numbers()` table function — https://clickhouse.com/docs/sql-reference/table-functions/numbers

## Issues Found
No technical issues found.

Function-level verification:
- `toDayOfWeek(date)` default Mode 0 returns 1 (Mon) through 7 (Sun): correct.
- `toMonday(date)` rounds DOWN to the previous Monday (Sat/Sun → previous Mon): correct, which is what the formula relies on.
- `dateDiff('day', start, end)`, `today()`, `intDiv`, `least`: all valid.
- `range(1, 15)` is half-open, producing [1..14] (14 elements): matches the comment "order_date + 1 through order_date + 14" and is sufficient to cover 5 business days across at most one weekend.
- `numbers(n)` generates 0..n-1; combined with `countIf(... NOT IN (6, 7))` yields the correct weekday count.
- `Date + toIntervalDay(n)` is a valid ClickHouse expression (the result is a Date when the left-hand operand is Date).
- Lambda syntax `d -> toDayOfWeek(d) NOT IN (6, 7)` inside `arrayFilter` is valid.

Formula-level verification (manually recomputed):
- Mon 2024-06-10 → Thu 2024-06-20: `1*5 + 3 - 0 = 8` ✓
- Mon 2024-06-10 → Fri 2024-06-14 (same week): `0*5 + 4 - 0 = 4` ✓
- Fri 2024-06-14 → Mon 2024-06-17: `1*5 + 0 - 4 = 1` ✓
- Numbers-table approach over `numbers(10)` starting at 2024-06-10: 8 weekdays ✓

Calendar sanity check (2024-06-10 = Monday, 2024-06-15 = Saturday, 2024-06-16 = Sunday, 2024-06-20 = Thursday): all correct.

## Review Notes
- The formula uses the "start inclusive, end exclusive" convention and the post states this clearly.
- Public holidays are not accounted for — expected for a generic post, but readers deploying this for real SLAs will need to subtract holiday dates separately (e.g., via an anti-join against a holidays table).
- `toDayOfWeek` supports a second `mode` argument in newer ClickHouse versions; the post correctly relies on the default Mode 0 (Mon=1..Sun=7). If a reader overrides the mode globally, the `<= 5`/`>= 6` weekday logic would need revisiting.
- The SLA-breach example treats `created_at` as having a time component (uses `toDate(created_at)`); this is a reasonable default and works for `Date` or `DateTime` columns.
