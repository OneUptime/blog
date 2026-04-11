# Validation Summary: How to Use UTC_DATE(), UTC_TIME(), UTC_TIMESTAMP() in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (UTC date/time functions)
- SQL (DDL, DML, and query examples)

## Sources Consulted
- MySQL 8.0 Reference Manual: UTC_DATE() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_utc-date
- MySQL 8.0 Reference Manual: UTC_TIME() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_utc-time
- MySQL 8.0 Reference Manual: UTC_TIMESTAMP() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_utc-timestamp
- MySQL 8.0 Reference Manual: CONVERT_TZ() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_convert-tz
- MySQL 8.0 Reference Manual: SYSDATE() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_sysdate
- MySQL 8.0 Reference Manual: Data Type Default Values (expression defaults) — https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html

## Issues Found
1. **Summary incorrectly claims all three functions support `fsp`**: The summary stated "All three functions support fractional seconds precision with the optional `fsp` parameter." However, `UTC_DATE()` does NOT accept an `fsp` parameter — only `UTC_TIME([fsp])` and `UTC_TIMESTAMP([fsp])` do. Fixed to: "`UTC_TIME()` and `UTC_TIMESTAMP()` support fractional seconds precision with the optional `fsp` parameter."

2. **EST/EDT timezone offset inaccuracy**: The comparison section stated `America/New_York` is "(UTC-5 during EST)" and that "NOW() will be 5 hours behind UTC_TIMESTAMP()." However, America/New_York alternates between EST (UTC-5) and EDT (UTC-4) depending on daylight saving time. The example context (March 31) would actually be EDT, not EST, making the difference 4 hours. Fixed to clarify both offsets and that the difference depends on daylight saving time.

## Review Notes
- The `DEFAULT (UTC_TIMESTAMP(6))` expression syntax in the `api_requests` table requires MySQL 8.0.13 or later. The post does not mention this version requirement, which could cause confusion for users on older MySQL versions. This is not an error but worth noting.
- The `DATE(created_at) = UTC_DATE()` pattern in the filtering section is correct but prevents index usage on `created_at`. The post later shows the range-based alternative (`>= UTC_DATE() AND < UTC_DATE() + INTERVAL 1 DAY`) which is the index-friendly approach. The juxtaposition is fine for a tutorial.
- The SYSDATE() description in the comparison table is correct but could benefit from noting that SYSDATE() differs from NOW() in that it returns the time at which it executes rather than statement start time. This is a potential future enhancement, not an error.
