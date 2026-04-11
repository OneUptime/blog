# Validation Summary: How to Use MySQL YEAR, MONTH, DAY, HOUR, MINUTE, SECOND Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (date and time functions)
- SQL (standard EXTRACT syntax)

## Sources Consulted
- MySQL 8.0 Reference Manual: Date and Time Functions — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual: EXTRACT function — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_extract
- MySQL 8.0 Reference Manual: WEEK function mode table — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_week

## Issues Found
1. **Missing FROM clause in MICROSECOND section**: The query `SELECT TIME(starts_at) AS time_part;` referenced the column `starts_at` without a `FROM events` clause, which would produce a SQL error. Fixed by adding `FROM events` to the statement.

## Review Notes
- The mermaid diagram values were verified: for 2026-03-31 (a Tuesday), DAYOFWEEK=3 (1=Sunday), WEEK=13 (default mode 0), and QUARTER=1 are all correct.
- The YEAR/MONTH/DAY output table matches the sample data exactly.
- DAYOFWEEK convention (1=Sunday, 7=Saturday) is correctly documented throughout.
- WEEKOFYEAR is correctly described as the ISO week equivalent (mode 3).
- The GROUP BY queries using column aliases (yr, mo) work in MySQL but would not in strict SQL-standard databases; this is acceptable since the post is MySQL-specific.
- The best practices section gives sound advice on index sargability, EXTRACT portability, and UTC storage.
- EXTRACT composite units list is accurate and complete for the commonly used combinations.
