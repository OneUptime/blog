# Validation Summary: How to Use UTC_TIMESTAMP() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- SQL (DDL, DML, stored procedures)
- UTC date/time functions (UTC_TIMESTAMP, UTC_DATE, UTC_TIME)
- CONVERT_TZ() for time zone conversion

## Sources Consulted
- MySQL 8.0 Reference Manual — UTC_TIMESTAMP(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_utc-timestamp
- MySQL 8.0 Reference Manual — Data Type Default Values (expression defaults): https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL 8.0 Reference Manual — CONVERT_TZ(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_convert-tz
- MySQL 8.0 Reference Manual — TIMESTAMPDIFF(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_timestampdiff
- MySQL 8.0 Reference Manual — Server System Variables (time_zone): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_time_zone

## Issues Found
No technical issues found.

## Review Notes
- The post mentions expression defaults require "MySQL 8.0+" — more precisely this was introduced in MySQL 8.0.13, but "8.0+" is an acceptable shorthand since 8.0.13 is a patch release within the 8.0 series.
- The NOW() vs UTC_TIMESTAMP() example correctly accounts for Eastern Daylight Time (UTC-4) being in effect on March 31, 2026 (DST begins second Sunday of March).
- CONVERT_TZ() requires that MySQL time zone tables are loaded (via mysql_tzinfo_to_sql). This is a runtime prerequisite not mentioned in the post, but it is a common assumption and not an error in the tutorial itself.
