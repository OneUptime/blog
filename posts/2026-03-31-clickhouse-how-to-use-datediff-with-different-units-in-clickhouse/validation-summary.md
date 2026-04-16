# Validation Summary: How to Use date_diff() with Different Units in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL date/time functions (`dateDiff` / `date_diff`)

## Sources Consulted
- ClickHouse official documentation: Date and Time Functions — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse `dateDiff` reference for function signature, aliases, return type, and supported units

## Issues Found
- **Incorrect output for `days_diff`**: The example output claimed `dateDiff('day', toDate('2024-01-01'), toDate('2024-06-15'))` returned `165`. Because 2024 is a leap year, the correct day count between these dates is `31 + 29 + 31 + 30 + 31 + 14 = 166`. ClickHouse `dateDiff` counts day boundaries crossed, which also yields 166 for this pair. Updated the output value from `165` to `166`.

## Review Notes
- Function signature `date_diff('unit', start, end [, timezone])` is correct; `date_diff` is a valid alias for `dateDiff`.
- All units listed (`second`, `minute`, `hour`, `day`, `week`, `month`, `quarter`, `year`) are officially supported. ClickHouse additionally supports sub-second units (`millisecond`, `microsecond`, `nanosecond`) and short aliases (e.g., `ss`, `mi`, `hh`, `dd`) — these are intentionally omitted for brevity and that is fine.
- The `months_diff` (5) and `years_diff` (4) outputs are correct because `dateDiff` counts unit boundaries crossed, not full calendar months/years.
- Negative-difference behavior (signed `Int64` result) is accurately described.
- The optional timezone argument is real and behaves as described for DST-aware day boundary calculations.
- `today()` and `yesterday()` functions used in examples are valid ClickHouse functions.
