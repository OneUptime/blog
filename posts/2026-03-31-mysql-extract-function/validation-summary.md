# Validation Summary: How to Use EXTRACT() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (EXTRACT() date/time function)
- SQL (standard date part extraction)

## Sources Consulted
- MySQL 8.0 Reference Manual — EXTRACT() function: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_extract
- MySQL 8.0 Reference Manual — WEEK() function and week modes: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_week
- MySQL 8.0 Reference Manual — Temporal Intervals: https://dev.mysql.com/doc/refman/8.0/en/expressions.html#temporal-intervals
- Calendar verification for 2026 (Jan 1, 2026 = Thursday; Mar 15, 2026 = Sunday)

## Issues Found

1. **WEEK value incorrect (Supported Units table and Basic Examples)**: The WEEK value for '2026-03-15' was listed as 10 but should be 11. With the default week mode 0 (weeks start on Sunday), Jan 1, 2026 (Thursday) through Jan 3 is week 0, Jan 4 (first Sunday) starts week 1. Counting forward, Mar 15 (a Sunday) starts week 11. Changed 10 → 11 in both the table and the basic examples section. Also updated the parenthetical comment from "ISO week may vary" to "depends on default_week_format" since the result depends on the MySQL system variable, not ISO vs non-ISO specifically.

2. **SECOND_MICROSECOND value incorrect (Supported Units table)**: Listed as 450000 but should be 45000000. The compound unit SECOND_MICROSECOND concatenates seconds (2 digits) with microseconds (6 digits) in SSMMMMMM format. For 45 seconds and 000000 microseconds, the result is 45000000 (8 digits), not 450000 (6 digits — was missing two trailing zeros).

3. **DAY_MICROSECOND value incorrect (Supported Units table)**: Listed as "1514303045000000 (approx)" but should be 15143045000000. The format is DDHHMMSSMMMMMM (day + hour + minute + second + microsecond). For day=15, hour=14, min=30, sec=45, microsecond=000000, the correct concatenation is 15143045000000. The original value had a duplicated "30" in the middle. Also removed the "(approx)" label since the value is exact.

4. **DAY_SECOND "(approx)" label removed (Supported Units table)**: The value 15143045 was correct but was labeled "(approx)". Compound unit values are exact, not approximate, so the label was removed.

## Review Notes
- The claim that `YEAR()`, `MONTH()`, `DAY()` are "MySQL-specific shortcuts" is a minor simplification — these functions exist in some other databases as well, but EXTRACT() is indeed the SQL-standard approach. This is an acceptable simplification for a MySQL-focused tutorial.
- The business hours filter (`BETWEEN 9 AND 17`) includes records from 9:00:00 through 17:59:59. This is a reasonable interpretation of "business hours" but readers should be aware it captures the full 5 PM hour.
- The WEEK value depends on the `default_week_format` system variable, which defaults to 0. The post could benefit from a brief note about this, but the current parenthetical is sufficient.
- All SQL syntax is correct and uses valid MySQL EXTRACT() usage patterns.
- The performance advice about avoiding EXTRACT() in WHERE clauses on indexed columns is accurate and important.
