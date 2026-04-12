# Validation Summary: How to Use LAG() Window Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL Window Functions (LAG, LEAD)
- PARTITION BY / ORDER BY clauses
- TIMESTAMPDIFF function

## Sources Consulted
- MySQL 8.0 Reference Manual: Window Functions — https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual: Window Function Descriptions (LAG) — https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual: Window Function Restrictions — https://dev.mysql.com/doc/refman/8.0/en/window-function-restrictions.html
- MySQL 8.0 Reference Manual: HAVING clause — https://dev.mysql.com/doc/refman/8.0/en/select.html

## Issues Found
1. **"Detecting Status Changes" section used HAVING to filter on a window function alias.** In MySQL 8.0, window functions are evaluated after WHERE, GROUP BY, and HAVING processing but before ORDER BY and LIMIT. This means window function results are not available in the HAVING clause. Using `HAVING prev_status IS NOT NULL AND prev_status <> status` on a window function alias would produce an error. Fixed by wrapping the query in a subquery and using WHERE to filter on the alias, which is the standard and correct approach (and consistent with the "Filtering with LAG() in a Subquery" section already in the post).

## Review Notes
- The syntax, parameter descriptions, and all other code examples are correct and consistent with MySQL 8.0 documentation.
- The example output table for the basic query is accurate.
- The year-over-year example uses `LAG(revenue, 12)` which would return NULL for all rows with only 5 months of sample data, but this is clearly illustrative and the intent is clear.
- The post correctly notes that LAG() was introduced in MySQL 8.0, which is accurate (window functions were added in MySQL 8.0.2).
