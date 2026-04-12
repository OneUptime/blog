# Validation Summary: How to Use WEEK() and YEARWEEK() Functions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (WEEK() and YEARWEEK() date functions)
- SQL date/time functions
- Window functions (LAG)

## Sources Consulted
- MySQL 8.0 Reference Manual: Date and Time Functions — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_week
- MySQL 8.0 Reference Manual: YEARWEEK() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_yearweek
- MySQL 8.0 Reference Manual: Server System Variables (default_week_format) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_default_week_format

## Issues Found

### 1. Incorrect Mode 2 Description
- **What was wrong:** The mode table described mode 2 as "First Sunday (week 1 = week containing Jan 1)". According to MySQL documentation, mode 2 defines week 1 as the first week with a Sunday in the current year (same as mode 0), but with a return range of 1-53 instead of 0-53. Days before the first Sunday are assigned to the last week of the previous year.
- **What was changed:** Updated mode 2 description to "First Sunday in the year (range 1-53)" to match MySQL documentation.
- **Why:** The original description was inaccurate and could mislead readers about how mode 2 calculates week numbers.

### 2. Week-over-Week Comparison Breaks at Year Boundaries
- **What was wrong:** The self-join used `ON current_week.year_week = prev_week.year_week + 1` to match consecutive weeks. Since YEARWEEK() returns values in YYYYWW format (e.g., 202552, 202601), simple arithmetic (+1) fails at year boundaries: 202552 + 1 = 202553, not 202601. This means the join produces NULL for the first week of every year.
- **What was changed:** Replaced the self-join approach with a `LAG()` window function, which correctly references the previous row regardless of the YEARWEEK value gap at year boundaries.
- **Why:** The original query had a logical bug that would silently produce incorrect results (missing week-over-week comparisons) at every year boundary.

## Review Notes
- The basic usage examples (WEEK and YEARWEEK return values for '2025-03-15') were verified to be correct for both default mode 0 and ISO mode 3.
- The LAG() window function fix requires MySQL 8.0+, which has been the standard production version since 2018. This is a reasonable baseline.
- The mode table intentionally omits modes 5 and 6, which is acceptable since the heading says "Common Mode Values." All included mode descriptions are now accurate.
- The post correctly notes that YEARWEEK() is preferred over WEEK() + YEAR() for grouping to avoid year-boundary ambiguity.
