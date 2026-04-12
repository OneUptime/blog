# Validation Summary: How to Use UTC_DATE() and UTC_TIME() Functions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (UTC_DATE, UTC_TIME, UTC_TIMESTAMP functions)
- MySQL date/time arithmetic (DATEDIFF, DATE_FORMAT, INTERVAL)
- MySQL timezone handling (SET time_zone, CONVERT_TZ)

## Sources Consulted
- MySQL 8.0 Reference Manual — UTC_DATE(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_utc-date
- MySQL 8.0 Reference Manual — UTC_TIME(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_utc-time
- MySQL 8.0 Reference Manual — UTC_TIMESTAMP(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_utc-timestamp
- MySQL 8.0 Reference Manual — Data Type Default Values (expression defaults): https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL 8.0 Reference Manual — Fractional Seconds in Time Values: https://dev.mysql.com/doc/refman/8.0/en/fractional-seconds.html

## Issues Found
No technical issues found.

## Review Notes
- The `DEFAULT (UTC_TIMESTAMP())` expression syntax used in CREATE TABLE statements requires MySQL 8.0.13 or later. Earlier versions only support `DEFAULT CURRENT_TIMESTAMP` for DATETIME columns. The post does not specify a minimum version for this feature, which could confuse users on older MySQL versions. This is not an error but could be clarified in a future update.
- The fractional seconds precision parameter (fsp) for UTC_TIMESTAMP(fsp) and UTC_TIME(fsp) was introduced in MySQL 5.6.4 specifically; stating "5.6+" is acceptable shorthand.
- The UTC vs Local Time example correctly shows a 4-hour offset for America/New_York on June 15 (EDT / UTC-4).
