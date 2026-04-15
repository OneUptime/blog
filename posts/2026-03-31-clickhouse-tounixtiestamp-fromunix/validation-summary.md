# Validation Summary: How to Use toUnixTimestamp() and fromUnixTimestamp() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- Unix timestamps / epoch time
- DateTime and DateTime64 types
- ClickHouse date/time functions (toUnixTimestamp, fromUnixTimestamp, toUnixTimestamp64Milli/Micro/Nano, fromUnixTimestamp64Milli/Micro/Nano)
- Timezone handling in ClickHouse

## Sources Consulted
- ClickHouse official documentation on toUnixTimestamp: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#tounixTimestamp
- ClickHouse official documentation on fromUnixTimestamp: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#fromunixtimestamp
- ClickHouse official documentation on DateTime64 functions (toUnixTimestamp64Milli/Micro/Nano, fromUnixTimestamp64Milli/Micro/Nano): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation on aliases and query clause visibility: https://clickhouse.com/docs/en/sql-reference/syntax#aliases
- Unix epoch timestamp verification for value 1743430427

## Issues Found
1. **Wrong year in epoch comment (line 52)**: The comment `-- human_readable: 2026-03-31 14:13:47` was incorrect. Unix epoch 1743430427 corresponds to **2025-03-31 14:13:47 UTC**, not 2026. Fixed the year from 2026 to 2025.

## Review Notes
- The function signature section lists `toUnixTimestamp(dt, timezone)` as a separate overload from `toUnixTimestamp(str, timezone)`. In ClickHouse, the timezone parameter is primarily meaningful for the string-input overload (since a DateTime value already carries timezone context). The code examples in the post only use the string form with timezone, so all example code is correct.
- The post correctly notes that ClickHouse allows SELECT aliases in the WHERE clause (used in the "Computing Intervals" section). This is a ClickHouse-specific extension to standard SQL.
- All SQL syntax, function names, and ClickHouse-specific functions (intDiv, subtractDays, subtractHours, toStartOfInterval) are correct and current.
- The 64-bit variant examples and the nanosecond-to-millisecond conversion math (dividing by 1e6) are correct.
- The timezone arithmetic example (JST vs UTC offset = 32400 seconds = 9 hours) is correct; Japan does not observe DST so the offset is constant.
