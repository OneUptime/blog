# Validation Summary: How to Get the First Day of the Month in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (date and time functions)
- SQL (SELECT, WHERE, GROUP BY, CAST)

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual — DATE_FORMAT: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format
- MySQL 8.0 Reference Manual — DATE_SUB / DATE_ADD: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-sub
- MySQL 8.0 Reference Manual — MAKEDATE: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_makedate
- MySQL 8.0 Reference Manual — STR_TO_DATE: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_str-to-date

## Issues Found
No technical issues found.

## Review Notes
- All SQL examples are syntactically correct and produce the expected results.
- The `DATE_FORMAT('%Y-%m-01')` approach correctly returns a string; the post correctly advises casting to DATE for arithmetic.
- The `DATE_SUB(date, INTERVAL DAY(date) - 1 DAY)` approach is mathematically sound for all months.
- The `MAKEDATE(2026, 60)` example is correct: 2026 is not a leap year, so Jan (31) + Feb (28) = 59, making March 1 day 60.
- The "First Day of Next/Previous Month" examples handle month-end edge cases correctly because `DATE_FORMAT` extracts only year and month after the interval arithmetic, avoiding day-overflow issues.
- The GROUP BY alias usage is valid in MySQL (a MySQL extension to standard SQL); worth noting this is not portable to all SQL dialects, but the post is MySQL-specific so this is appropriate.
