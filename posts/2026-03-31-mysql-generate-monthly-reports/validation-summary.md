# Validation Summary: How to Generate Monthly Reports in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+ for CTEs and window functions)
- DATE_FORMAT function
- GROUP BY with aggregation (COUNT, SUM, AVG)
- Common Table Expressions (WITH, WITH RECURSIVE)
- Window functions (LAG)
- INSERT ... ON DUPLICATE KEY UPDATE
- MySQL Event Scheduler (CREATE EVENT)

## Sources Consulted
- MySQL 8.0 Reference Manual: DATE_FORMAT function — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format
- MySQL 8.0 Reference Manual: Window Functions (LAG) — https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_lag
- MySQL 8.0 Reference Manual: Recursive CTEs — https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual: CREATE EVENT — https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual: GROUP BY handling with ONLY_FULL_GROUP_BY — https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html

## Issues Found

1. **Misleading column name `new_customers`**: The column in the `monthly_order_report` table was named `new_customers`, but the query populating it used `COUNT(DISTINCT customer_id)`, which counts all unique customers for the month — not new (first-time) customers. Renamed the column to `unique_customers` to accurately reflect what the query computes.

2. **Incomplete ON DUPLICATE KEY UPDATE clause**: The `ON DUPLICATE KEY UPDATE` only updated `order_count` and `total_revenue`, omitting the `unique_customers` (formerly `new_customers`) column. If the INSERT ran again for the same month, the customer count would not be refreshed. Added `unique_customers = VALUES(unique_customers)` to the UPDATE clause.

## Review Notes
- The `VALUES()` function used in `ON DUPLICATE KEY UPDATE` has been deprecated since MySQL 8.0.20 (April 2020). The recommended replacement is the row/column alias syntax introduced in MySQL 8.0.19 (e.g., `INSERT INTO ... SELECT ... AS new ON DUPLICATE KEY UPDATE col = new.col`). The current syntax still works but will generate deprecation warnings on MySQL 8.0.20+. A future update could modernize this.
- The recursive CTE for filling missing months relies on implicit string-to-date conversion (`DATE_FORMAT` returns VARCHAR, which is then used in `+ INTERVAL 1 MONTH` arithmetic). This works in MySQL 8.0 but could be made more explicit with `CAST()` or `STR_TO_DATE()` for clarity and robustness.
- CTEs (`WITH`), recursive CTEs (`WITH RECURSIVE`), and window functions (`LAG`) all require MySQL 8.0+. The post does not mention this version requirement, which could confuse readers on MySQL 5.7 or earlier.
- The Event Scheduler example uses `...` as a placeholder for the INSERT body, which is clear in context but is not executable as written. This is acceptable for brevity in a tutorial.
