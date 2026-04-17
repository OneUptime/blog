# Validation Summary: How to Use dateDiff() with Different Time Units in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL / date-time functions: `dateDiff`, `age`, `toDate`, `toDateTime`, `today`, `toQuarter`, `toYear`, `intDiv`, `concat`, `toString`, `multiIf`, `coalesce`)

## Sources Consulted
- ClickHouse official documentation — Date and Time Functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions (specifically the `dateDiff` and `age` sections)
- ClickHouse documentation on supported units for `dateDiff` (nanosecond, microsecond, millisecond, second, minute, hour, day, week, month, quarter, year)
- Manual arithmetic verification of the numeric example (2024-01-01 00:00:00 → 2024-06-15 12:30:00, leap year)

## Issues Found
- **Incorrect expected output values** in the "Basic Examples Across All Units" output block. The seconds/minutes/hours values were internally inconsistent with the days/weeks/months values. For the pair `2024-01-01 00:00:00` → `2024-06-15 12:30:00` (166 days + 12h30m, 2024 is a leap year), the correct values are:
  - `diff_seconds`: 14,387,400 (was 14,259,000)
  - `diff_minutes`: 239,790 (was 237,650)
  - `diff_hours`: 3,996 (was 3,960)
  The original numbers corresponded to a 165-day + 50-minute span, inconsistent with the other columns (days=166, etc.). Fixed the output table to reflect the correct arithmetic.

## Review Notes
- The boundary-crossing semantics described for `dateDiff` (including the `2024-01-31` → `2024-02-01` = 1 and `2024-01-01` → `2024-01-31` = 0 month examples) match ClickHouse's documented behavior.
- The `age()` recommendation for "full elapsed calendar units" is correct — ClickHouse's `age()` function returns completed-unit counts, whereas `dateDiff()` counts boundary crossings.
- `dateDiff('week', ...)` counts Monday boundaries by default; 2024-01-01 is a Monday and 2024-06-15 is a Saturday, so 23 Monday boundaries between them is correct.
- The SQL snippets (incident duration, aging buckets, subscription months, multi-unit decomposition, quarterly growth) all use valid ClickHouse functions and syntax.
- `MOD` is accepted by ClickHouse as a SQL-standard alias for the `modulo` function, so `total_seconds MOD 3600` is valid.
- No version-specific caveats; `dateDiff` and `age` have been stable in ClickHouse for multiple recent releases.
