# Validation Summary: How to Use Window Functions in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL Window Functions (ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD, FIRST_VALUE, LAST_VALUE, NTILE, PERCENT_RANK, CUME_DIST)
- Common Table Expressions (CTEs)
- Named Windows (WINDOW clause)

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual — Window Function Descriptions: https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual — Window Function Frame Specification: https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html
- MySQL 8.0 Reference Manual — Named Windows: https://dev.mysql.com/doc/refman/8.0/en/window-functions-named-windows.html

## Issues Found
1. **Named Windows example — misleading alias `dept_total_salary`**: The named window `dept_window` is defined as `(PARTITION BY department ORDER BY salary DESC)`. When `SUM(salary)` uses this window, the default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` (because `ORDER BY` is present), making it a cumulative/running sum — not the total department salary. Renamed the alias from `dept_total_salary` to `dept_running_salary` to accurately reflect the query's behavior.

## Review Notes
- The FIRST_VALUE and LAST_VALUE section title mentions both functions, but only demonstrates `FIRST_VALUE`. This is a content gap rather than a technical error.
- All SQL syntax is correct for MySQL 8.0 and uses current, non-deprecated features.
- The frame clause usage in the FIRST_VALUE example (`ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`) is a good practice — it ensures the full partition is visible, which is especially important for `LAST_VALUE` where the default frame would otherwise exclude rows after the current row.
- The moving average example correctly uses `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` for a 7-day window (current row + 6 preceding = 7 rows).
