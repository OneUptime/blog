# Validation Summary: How to Use toTimezone() in ClickHouse for Timezone Conversion

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (DateTime type, timezone handling)
- SQL (ClickHouse SQL dialect)
- IANA timezone database

## Sources Consulted
- [ClickHouse Date and Time Functions Documentation](https://clickhouse.com/docs/sql-reference/functions/date-time-functions)
- [ClickHouse DateTime Data Type Documentation](https://clickhouse.com/docs/sql-reference/data-types/datetime)
- [Altinity Knowledge Base - Time Zones](https://kb.altinity.com/altinity-kb-queries-and-syntax/time-zones/)
- [Tinybird - How to convert DateTimes to a different timezone with toTimeZone](https://www.tinybird.co/blog/convert-datetime-timezone-clickhouse-totimezone)
- [ClickHouse Blog - Working with Time Series Data](https://clickhouse.com/blog/working-with-time-series-data-and-functions-ClickHouse)

## Issues Found

### 1. `toUTC()` does not exist as a built-in ClickHouse function
- **What was wrong:** The post claimed `toUTC(dt)` is "a convenience shorthand for `toTimezone(dt, 'UTC')`" and used it in code examples. No such function exists in ClickHouse. It does not appear in the official documentation, the Altinity knowledge base, or any authoritative ClickHouse references.
- **What was changed:**
  - Updated the title from "How to Use toTimezone() and toUTC() in ClickHouse" to "How to Use toTimezone() in ClickHouse for Timezone Conversion"
  - Updated the description to remove the `toUTC()` reference
  - Rewrote the intro paragraph to explain that `toTimezone(dt, 'UTC')` is the correct way to convert to UTC, removing the false claim about `toUTC()`
  - Changed the "toUTC: Normalizing to UTC" section heading to "Normalizing to UTC" and replaced `toUTC(local_time)` with `toTimezone(local_time, 'UTC')` in the code example
  - Updated the summary section to use `toTimezone(dt, 'UTC')` instead of `toUTC(dt)`
- **Why:** Using a non-existent function would cause a "Unknown function toUTC" error if readers tried to run the code.

## Review Notes
- All timezone offset calculations in the examples are correct (verified against DST rules for June 15, 2024: New York EDT UTC-4, London BST UTC+1, Tokyo JST UTC+9).
- The `formatDateTime` third-argument timezone usage is correct.
- The parameterized query syntax `{user_timezone: String}` is valid ClickHouse syntax.
- The `system.columns` query for inspecting timezone metadata is correct.
- The `BETWEEN 9 AND 16` filter for business hours (9am-5pm) captures hours 9:00:00 through 16:59:59, which is a correct interpretation of "during business hours" (events occurring before 5pm).
- ClickHouse accepts both `toTimezone` and `toTimeZone` (case-insensitive function names), so the lowercase-z spelling used throughout the post is fine.
