# Validation Summary: How to Convert Data Types in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (CAST, CONVERT, STR_TO_DATE, DATE_FORMAT, FROM_UNIXTIME, UNIX_TIMESTAMP, JSON functions)

## Sources Consulted
- MySQL 8.0 Reference Manual: CAST and CONVERT functions — https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html
- MySQL 8.0 Reference Manual: Type Conversion in Expression Evaluation — https://dev.mysql.com/doc/refman/8.0/en/type-conversion.html
- MySQL 8.0 Reference Manual: Date and Time Functions — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual: String Functions (CONCAT) — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html
- MySQL 8.0 Reference Manual: JSON Functions — https://dev.mysql.com/doc/refman/8.0/en/json-functions.html
- MySQL 8.0 Reference Manual: Mathematical Functions (TRUNCATE, FLOOR, CEIL, ROUND) — https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html
- Python `datetime`/`calendar` modules to verify Unix timestamp values

## Issues Found
- **Incorrect Unix timestamp**: `FROM_UNIXTIME(1743379200)` was used as an example, but `1743379200` corresponds to `2025-03-31 00:00:00 UTC`, not a 2026 date. Since every other date example in the post uses 2026-03-31, this was inconsistent and misleading. Changed to `FROM_UNIXTIME(1774915200)`, which correctly corresponds to `2026-03-31 00:00:00 UTC`.

## Review Notes
- The `CAST(... AS FLOAT)` and `CAST(... AS DOUBLE)` syntax was added in MySQL 8.0.17. The post does not specify a minimum version, but this is only relevant for older MySQL installations.
- The `ROUND(9.5)` example is correct for exact-value (DECIMAL) literals. MySQL uses "round half away from zero" for exact values but "round half to nearest even" (banker's rounding) for FLOAT/DOUBLE arguments, which could surprise readers in edge cases. The post's example is correct as written.
- All other SQL syntax, function signatures, implicit conversion behaviors, format specifiers, and output comments were verified and are accurate.
