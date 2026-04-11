# Validation Summary: How to Use the MIN() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (general, and 8.0+ for window functions)
- SQL aggregate functions (MIN, MAX)
- SQL window functions

## Sources Consulted
- MySQL 8.0 Reference Manual: Aggregate Function Descriptions — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_min
- MySQL 8.0 Reference Manual: Window Function Concepts — https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual: SELECT Statement (GROUP BY, HAVING, ORDER BY) — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: MySQL Extensions to GROUP BY (alias in HAVING) — https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html

## Issues Found
No technical issues found.

## Review Notes
- The `HAVING min_price > 20.00` clause uses a column alias, which is a MySQL-specific extension to standard SQL. This is correct for MySQL but would not work in all SQL databases. The post targets MySQL so this is appropriate.
- The claim that the JOIN approach for finding the row with the minimum value is "more efficient for large tables" than the subquery approach is debatable. MySQL's optimizer often handles scalar subqueries efficiently, and both approaches typically produce similar execution plans. This is not technically wrong, but readers should benchmark for their specific use case.
- The `YEAR(order_date) = 2025` filter in the WHERE example is correct but prevents index usage on the `order_date` column. A range condition like `order_date >= '2025-01-01' AND order_date < '2026-01-01'` would be more index-friendly. This is a performance consideration, not a correctness issue, so no change was made.
