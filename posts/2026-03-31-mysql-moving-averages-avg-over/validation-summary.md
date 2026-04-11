# Validation Summary: How to Use Moving Averages with AVG() OVER() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL Window Functions (AVG() OVER())
- ROWS BETWEEN frame specifications

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Function Concepts: https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual — Window Function Frame Specification: https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html
- MySQL 8.0 Reference Manual — AVG() aggregate function: https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_avg
- Manual arithmetic verification of all output values in the 3-day moving average result table

## Issues Found
1. **`MIN_COUNT` does not exist in MySQL** (Best Practices section, line 198): The post recommended using `MIN_COUNT` to handle early rows with fewer observations than the full window size. MySQL has no `MIN_COUNT` option for window functions — this is a concept from pandas, not SQL. Fixed by replacing with the correct MySQL approach: using a `CASE` expression with `COUNT(*) OVER (...)` to return NULL when fewer than N rows are available.

## Review Notes
- All SQL syntax is correct and valid for MySQL 8.0+.
- All computed output values in the 3-day moving average result table were manually verified and are correct.
- The explanation of default frame behavior (`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`) is accurate per the MySQL 8.0 docs.
- The distinction between ROWS and RANGE frame modes and the warning about peer rows is correct and helpful.
- The sample data uses future dates (2026) which is fine for a tutorial.
- The 7-day moving average example only has 7 rows per ticker, so the full 7-day window only applies to the last row of each partition — this is technically correct but readers should be aware the smoothing effect is minimal with so few data points.
