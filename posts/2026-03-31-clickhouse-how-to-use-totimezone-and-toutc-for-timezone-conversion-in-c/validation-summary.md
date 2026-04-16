# Validation Summary: How to Use toTimezone() and toUTC() for Timezone Conversion in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (DateTime type, timezone conversion functions, MergeTree engine)
- SQL (DDL, DML, CASE expressions, aggregations)
- IANA timezone database

## Sources Consulted
- [ClickHouse - Functions for Working with Dates and Times](https://clickhouse.com/docs/sql-reference/functions/date-time-functions)
- [ClickHouse GitHub - date-time-functions.md](https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/sql-reference/functions/date-time-functions.md)
- [Altinity Knowledge Base - Time zones](https://kb.altinity.com/altinity-kb-queries-and-syntax/time-zones/)
- [Tinybird - Convert DateTime to a different timezone](https://www.tinybird.co/blog/convert-datetime-timezone-clickhouse-totimezone)

## Issues Found

1. **Fabricated function `toUTC()`**: The post referenced a `toUTC(dt)` function as a core ClickHouse timezone conversion primitive. ClickHouse has no such function. The real functions related to UTC conversion are `toUTCTimestamp(dt, tz)` and `fromUTCTimestamp(dt, tz)` (both introduced for Spark/Hive compatibility and requiring two arguments). The idiomatic way to render a DateTime as UTC is `toTimezone(dt, 'UTC')`, since ClickHouse always stores DateTime as a UTC Unix timestamp and `toTimezone` only changes the display timezone metadata.

   **Changes made**:
   - Updated the post title from `How to Use toTimezone() and toUTC() for Timezone Conversion in ClickHouse` to `How to Use toTimezone() for Timezone Conversion in ClickHouse`.
   - Updated the Description and Overview to remove `toUTC()` references.
   - Renamed the section heading `## toUTC() - Converting to UTC` to `## Converting to UTC with toTimezone()` and rewrote its explanation to clarify that `toTimezone(dt, 'UTC')` changes only the displayed timezone (the underlying Unix timestamp is unchanged).
   - Replaced the example `toUTC(toDateTime('2024-06-15 10:00:00', 'America/New_York'))` with `toTimezone(toDateTime('2024-06-15 10:00:00', 'America/New_York'), 'UTC')`.
   - Replaced `toUTC(created_at)` in the orders table example with `toTimezone(created_at, 'UTC') AS utc_time` and updated the inline comment accordingly.
   - Updated the Summary section to reflect `toTimezone()` as the single primary tool (no more `toUTC`).

## Review Notes

- All remaining claims were verified against official ClickHouse documentation:
  - `toDateTime(string, 'timezone')` accepts an IANA timezone as the second argument and produces a `DateTime('timezone')` value — correct.
  - Timezone arithmetic in examples is accurate: New York is UTC-4 in June (EDT) → 10:00 → 14:00 UTC; Chicago is UTC-5 in June (CDT) → 09:00 → 14:00 UTC.
  - `DateTime('timezone')` column type, `system.time_zones` system table, and `now()` are all real and used correctly.
  - The pitfalls about IANA names vs. numeric offsets and the server-timezone assumption for plain DateTime values are accurate.
- One minor observation (not corrected, as it was not technically wrong): the `CASE` expression in the "Query with user-local time" example mixes branches that return `DateTime('America/New_York')`, `DateTime('Asia/Tokyo')`, and a plain `DateTime`. ClickHouse resolves this to a common supertype for display, so the result may not carry the originally intended per-row timezone, but the query itself is syntactically valid and produces correct UTC instants.
- `toUTCTimestamp()` and `fromUTCTimestamp()` exist as real ClickHouse functions and could have been used instead, but they require the source timezone as a second argument and are primarily provided for Spark/Hive compatibility; the minimal fix to stay close to the author's intent was to use `toTimezone(..., 'UTC')`.
