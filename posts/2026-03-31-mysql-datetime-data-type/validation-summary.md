# Validation Summary: How to Use DATETIME Data Type in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DATETIME data type, fractional seconds, date/time functions, indexing)

## Sources Consulted
- MySQL 8.0 Reference Manual: The DATE, DATETIME, and TIMESTAMP Types — https://dev.mysql.com/doc/refman/8.0/en/datetime.html
- MySQL 8.0 Reference Manual: Data Type Storage Requirements — https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html
- MySQL 8.0 Reference Manual: Automatic Initialization and Updating for TIMESTAMP and DATETIME — https://dev.mysql.com/doc/refman/8.0/en/timestamp-initialization.html
- MySQL 8.0 Reference Manual: Date and Time Functions — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual: Fractional Seconds in Time Values — https://dev.mysql.com/doc/refman/8.0/en/fractional-seconds.html

## Issues Found
No technical issues found.

## Review Notes
- The BETWEEN query for "Events in April 2026" uses `'2026-04-30 23:59:59'` as the upper bound. This is correct for a plain DATETIME column (no fractional seconds), but if the column were DATETIME(n) with fractional seconds, events at `23:59:59.000001` through `23:59:59.999999` would still be included while an event exactly at midnight `2026-05-01 00:00:00` would not. Since the events table uses plain DATETIME, this is not an issue here.
- The TIMESTAMP range shorthand "1970-2038" in the comparison table is accurate (full range: `1970-01-01 00:00:01` UTC to `2038-01-19 03:14:07` UTC).
- Using `DATE(start_at) = CURDATE()` wraps the column in a function, which prevents index usage on `start_at`. A range condition like `start_at >= CURDATE() AND start_at < CURDATE() + INTERVAL 1 DAY` would be more index-friendly, but this is a style/performance consideration, not a correctness issue.
