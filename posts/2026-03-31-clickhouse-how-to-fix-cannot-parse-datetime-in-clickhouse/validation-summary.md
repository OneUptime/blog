# Validation Summary: How to Fix 'Cannot parse datetime' in ClickHouse

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- ClickHouse (DateTime, DateTime64, Date types)
- ClickHouse SQL functions: `toDateTime`, `toDateTime64`, `parseDateTimeBestEffort`, `parseDateTimeBestEffortOrNull`, `parseDateTime`, `toTimeZone`, `formatDateTime`, `fromUnixTimestamp64Milli`, `fromUnixTimestamp64Micro`
- ClickHouse settings: `date_time_input_format`, `input_format_csv_delimiter`
- ClickHouse `file()` table function
- `clickhouse-client` CLI

## Sources Consulted
- [ClickHouse Type Conversion Functions documentation](https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions)
- [ClickHouse Date and Time Functions documentation](https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions)
- [ClickHouse blog: 5 ways to parse Dates and DateTimes](https://clickhouse.com/blog/parsing-dates-datetimes)
- [ClickHouse PR #47246 — Change the behavior of %M in formatDateTime/parseDateTime to match MySQL](https://github.com/ClickHouse/ClickHouse/pull/47246)
- [ClickHouse PR #48420 — MySQL compat: Implement %f in parseDateTime](https://github.com/ClickHouse/ClickHouse/pull/48420)

## Issues Found
- **Incorrect format specifier `%M` used for minutes with `parseDateTime` and `formatDateTime`.** In ClickHouse v23.4+, these functions follow MySQL syntax where `%M` means the full month name (e.g. "January"), and `%i` means minutes. The blog used `%M` for minutes in three places:
  1. `parseDateTime('15/01/2024 10:30:00', '%d/%m/%Y %H:%M:%S')` — fixed to `'%d/%m/%Y %H:%i:%s'`.
  2. `parseDateTime('01 Jan 2024 10:30:00', '%d %b %Y %H:%M:%S')` — fixed to `'%d %b %Y %H:%i:%s'`.
  3. The "Common Format Reference" section listed `%M - minute (00-59)` and `%B - full month name`, which is wrong for ClickHouse's MySQL-style `parseDateTime`. Corrected to `%i - minute (00-59)`, `%s - second (00-59)`, and `%M - full month name`. The `formatDateTime` example was updated accordingly to use `%i:%s`. (Note: `%B` is not a valid specifier in ClickHouse MySQL-style `parseDateTime`; `%M` is the full month name.)

## Review Notes
- All other technical claims verified:
  - Error code 41 maps to `CANNOT_PARSE_DATETIME` in ClickHouse. ✓
  - `DateTime` natively accepts `YYYY-MM-DD HH:MM:SS` and Unix integer timestamps. ✓
  - `parseDateTimeBestEffort` / `parseDateTimeBestEffortOrNull` behave as described. ✓
  - `toDateTime(..., 'UTC')` and similar timezone-parameter forms are valid. ✓
  - `toDateTime64` precision parameters (3 for ms, 6 for µs) are correct. ✓
  - `fromUnixTimestamp64Milli` and `fromUnixTimestamp64Micro` are valid ClickHouse functions. ✓
  - `toTimeZone(...)` usage for post-parse timezone conversion is correct. ✓
  - `date_time_input_format = 'best_effort'` is a valid setting. ✓
  - `clickhouse-client --query ... --input_format_csv_delimiter=','` flags are valid. ✓
- Version caveat: The `%M` → month-name change occurred in ClickHouse v23.4 (April 2023). On older clusters, `%M` still prints minutes; readers on very old deployments should be aware.
- ClickHouse also supports a Joda-syntax variant (`parseDateTimeInJodaSyntax`) with different specifiers, which is worth mentioning for completeness in future revisions but not technically required here.
