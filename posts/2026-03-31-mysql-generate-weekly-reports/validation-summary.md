# Validation Summary: How to Generate Weekly Reports in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+ for CTEs and window functions)
- YEARWEEK() function
- DAYOFWEEK() / WEEKDAY() functions
- Window functions (LAG)
- Common Table Expressions (CTEs)
- ON DUPLICATE KEY UPDATE

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual — YEARWEEK(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_yearweek
- MySQL 8.0 Reference Manual — DAYOFWEEK(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_dayofweek
- MySQL 8.0 Reference Manual — WEEKDAY(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_weekday
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual — INSERT ... ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html

## Issues Found
1. **Storing Weekly Reports: incorrect `week_start_date` calculation** — The original query used `MIN(DATE(order_date))` for the `week_start_date` column. This only returns the correct Monday if there happens to be order data on Monday. If the earliest order in a given week falls on Tuesday or later, the stored `week_start_date` would be wrong. Fixed by replacing with `MIN(DATE(order_date)) - INTERVAL WEEKDAY(MIN(DATE(order_date))) DAY`, which uses `WEEKDAY()` (0=Monday, 6=Sunday) to always compute the actual Monday of the ISO week regardless of which days have data.

## Review Notes
- The post requires MySQL 8.0+ due to its use of CTEs (`WITH` clause) and window functions (`LAG()`). This is not stated explicitly in the post; authors may want to add a version note.
- `VALUES()` in `ON DUPLICATE KEY UPDATE` was deprecated in MySQL 8.0.20 in favor of row alias syntax (e.g., `INSERT INTO ... SELECT ... AS new ON DUPLICATE KEY UPDATE col = new.col`). The current syntax still works but may generate deprecation warnings on MySQL 8.0.20+.
- The "Day of Week Breakdown" query orders by `DAYOFWEEK()` which starts with Sunday (1=Sunday). For ISO week reports (where Monday is the first day), ordering by `WEEKDAY()` (0=Monday) would be more natural. Not a technical error, but a UX consideration.
- The post description mentions `WEEK()` as a covered function, but no example in the post uses `WEEK()`. All examples use `YEARWEEK()` instead.
