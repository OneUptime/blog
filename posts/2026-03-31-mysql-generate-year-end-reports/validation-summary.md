# Validation Summary: How to Generate Year-End Reports in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+ required for window functions: LAG, RANK, SUM OVER)
- SQL aggregate functions (COUNT, SUM, AVG, MAX)
- Common Table Expressions (CTEs)
- Window functions (LAG, RANK, SUM OVER)

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual — Window Function Restrictions: https://dev.mysql.com/doc/refman/8.0/en/window-function-restrictions.html
- MySQL 8.0 Reference Manual — GROUP BY and HAVING with Window Functions: https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html
- MySQL 8.0 Reference Manual — Date and Time Functions (YEAR, MONTH, MONTHNAME): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual — WITH (Common Table Expressions): https://dev.mysql.com/doc/refman/8.0/en/with.html

## Issues Found
1. **Top Products query: HAVING clause references a window function alias** — The original query used `HAVING revenue_rank <= 10` to filter on a `RANK()` window function result. In MySQL, window functions are evaluated after the HAVING clause, so referencing a window function alias in HAVING produces an error. Fixed by wrapping the query in a CTE (`WITH ranked AS (...)`) and filtering with `WHERE revenue_rank <= 10` in the outer query instead.

## Review Notes
- All queries require MySQL 8.0 or later due to use of CTEs and window functions (LAG, RANK, SUM OVER). The post does not explicitly state the minimum MySQL version, but this is a minor omission rather than an error.
- The nested window aggregate `SUM(SUM(total_amount)) OVER ()` in the Monthly Trend query is valid MySQL 8.0+ syntax for computing per-group aggregates relative to the overall total.
- The YoY comparison query uses `GROUP BY yr` with a SELECT alias, which MySQL permits (unlike standard SQL). This is correct but MySQL-specific behavior.
