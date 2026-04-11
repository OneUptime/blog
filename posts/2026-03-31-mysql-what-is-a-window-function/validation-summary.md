# Validation Summary: What Is a Window Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL 8.0
- SQL Window Functions (ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD, FIRST_VALUE, LAST_VALUE, NTILE, SUM, AVG)
- Named WINDOW clause

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Function Concepts and Syntax: https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual — Window Function Descriptions: https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual — Window Function Frame Specification: https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html
- MySQL 8.0 Reference Manual — Named Windows: https://dev.mysql.com/doc/refman/8.0/en/window-functions-named-windows.html

## Issues Found
- **Named Windows example: misleading alias `dept_avg`** — The named window `dept_window` includes `ORDER BY salary DESC`. When `AVG(salary)` is used over this window without an explicit frame clause, MySQL defaults to `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, which produces a running/cumulative average rather than the full department average. The alias `dept_avg` implied it was the entire department's average, which is incorrect. Changed to `dept_running_avg` to accurately reflect the computed value.

## Review Notes
- The FIRST_VALUE/LAST_VALUE example correctly specifies an explicit frame (`ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`) for LAST_VALUE. This is a common pitfall that the author handled properly — without the explicit frame, LAST_VALUE would only consider rows up to the current row due to the default frame.
- The rolling 7-day average example uses `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`, which counts rows, not calendar days. This works correctly under the assumption that `daily_revenue` has exactly one row per day with no gaps, which is a reasonable assumption for the example.
- All SQL syntax is valid for MySQL 8.0+. Window functions are not available in MySQL 5.7 or earlier, which the post correctly notes.
