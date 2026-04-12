# Validation Summary: How to Use DAYNAME() and MONTHNAME() Functions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (DAYNAME(), MONTHNAME(), DAYOFWEEK(), WEEKDAY(), MONTH() functions)
- SQL date functions
- MySQL locale system variable `lc_time_names`
- MySQL generated (computed) columns

## Sources Consulted
- MySQL 8.0 Reference Manual: Date and Time Functions — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual: MySQL Server Locale Support — https://dev.mysql.com/doc/refman/8.0/en/locale-support.html
- MySQL 8.0 Reference Manual: CREATE TABLE and Generated Columns — https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- Calendar day-of-week calculations for 2026 dates (verified January 1 = Thursday, March 31 = Tuesday, March 30 = Monday)

## Issues Found
- **German locale month name**: The post claimed `MONTHNAME('2026-03-31')` with `lc_time_names = 'de_DE'` returns `'Maerz'`. MySQL uses proper Unicode characters and returns `'März'` (with the umlaut ä), not the ASCII transliteration. Fixed to `'März'`.

## Review Notes
- All day-of-week calculations were verified correct: 2026-01-01 is Thursday, 2026-03-31 is Tuesday, 2026-03-30 is Monday.
- DAYOFWEEK() returns 3 for Tuesday (1=Sunday through 7=Saturday) and WEEKDAY() returns 1 for Tuesday (0=Monday through 6=Sunday) — both correct.
- Spanish locale values (`martes`, `marzo`) are correct.
- The GROUP BY patterns pairing name functions with numeric counterparts for proper ordering is a solid and correct recommendation.
- The generated column approach for performance is valid MySQL syntax and good advice.
- The calendar display subquery using UNION to generate a sequence is a valid pre-8.0 compatible approach. MySQL 8.0+ users could alternatively use recursive CTEs, but the approach shown works across versions.
- VARCHAR(10) for the generated weekday column is sufficient for English (longest: "Wednesday" = 9 chars) but may be tight for some locales. Not incorrect for the English-focused example shown.
