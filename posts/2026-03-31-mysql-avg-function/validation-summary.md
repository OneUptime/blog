# Validation Summary: How to Use the AVG() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (general, all versions)
- MySQL 8.0+ window functions

## Sources Consulted
- MySQL 8.0 Reference Manual: AVG() function — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_avg
- MySQL 8.0 Reference Manual: Window Functions — https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual: IFNULL() — https://dev.mysql.com/doc/refman/8.0/en/flow-control-functions.html#function_ifnull
- MySQL 8.0 Reference Manual: ROUND() — https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_round
- MySQL 8.0 Reference Manual: SELECT syntax (GROUP BY, HAVING) — https://dev.mysql.com/doc/refman/8.0/en/select.html

## Issues Found
No technical issues found.

## Review Notes
- The `HAVING avg_salary > 65000` clause uses a column alias, which is a MySQL-specific extension to standard SQL. This is correct for a MySQL-focused post but worth noting for readers who may try to port the query to other databases (e.g., PostgreSQL, SQL Server) where the alias would not be recognized in HAVING and `HAVING AVG(salary) > 65000` would be required instead.
- The `YEAR(order_date) = 2025` filter in the WHERE clause is functionally correct but prevents index usage on `order_date`. A range condition like `order_date >= '2025-01-01' AND order_date < '2026-01-01'` would be more performant. This is a performance consideration rather than a correctness issue.
