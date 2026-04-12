# Validation Summary: How to Handle Time Zones in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (TIMESTAMP, DATETIME types, CONVERT_TZ function, time zone system variables)
- mysql_tzinfo_to_sql utility
- MySQL configuration (my.cnf)

## Sources Consulted
- MySQL 8.0 Reference Manual: Time Zone Support — https://dev.mysql.com/doc/refman/8.0/en/time-zone-support.html
- MySQL 8.0 Reference Manual: CONVERT_TZ() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_convert-tz
- MySQL 8.0 Reference Manual: The TIMESTAMP and DATETIME Data Types — https://dev.mysql.com/doc/refman/8.0/en/datetime.html
- MySQL 8.0 Reference Manual: Server System Variables (time_zone) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_time_zone

## Issues Found

1. **'UTC' incorrectly grouped with offset syntax**: The `SET time_zone = 'UTC'` line was placed alongside the offset `'+00:00'` under a comment implying neither needs populated time zone tables. In reality, 'UTC' is a named time zone and requires the mysql.time_zone_name tables to be populated, just like 'America/New_York'. Moved 'UTC' into the named zone group and clarified the offset comment.

2. **Imprecise UTC offset in TIMESTAMP vs DATETIME example**: The comment stated "ts_col shifts by +5 hours (UTC)" but the offset between America/New_York and UTC is +5 hours during EST and +4 hours during EDT. Updated to "+4 or +5 hours (UTC, depending on DST)" for accuracy.

3. **DST section contained multiple errors**:
   - The example `CONVERT_TZ('2025-03-09 02:30:00', 'UTC', 'America/New_York')` converted FROM UTC TO Eastern. At 02:30 UTC on March 9, 2025, New York is still in EST (the DST transition happens at 07:00 UTC), so the result would be 21:30 EST on March 8 — nowhere near the DST gap. Fixed the direction to convert from 'America/New_York' to 'UTC' where the source time actually falls in the gap.
   - The claim that CONVERT_TZ "returns NULL" for DST gap times is incorrect. CONVERT_TZ returns NULL only when arguments are NULL or when named time zones are not found in the tz tables. For gap times, MySQL resolves them using the pre-transition (standard time) offset. Corrected the explanation and comment.

## Review Notes
- The post correctly recommends storing everything in UTC, which is the industry best practice.
- The `default-time-zone = 'UTC'` setting in my.cnf also requires populated tz tables; using `default-time-zone = '+00:00'` would be the alternative without tz tables. The post doesn't call this out but it's implied by the earlier section on populating tables.
- The TIMESTAMP type has a limited range (1970-2038 in 32-bit implementations). For dates outside this range, DATETIME with explicit UTC handling is needed. The post doesn't mention this but it's a minor omission for the scope of the article.
