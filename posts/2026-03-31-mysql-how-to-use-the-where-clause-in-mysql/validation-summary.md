# Validation Summary: How to Use the WHERE Clause in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (WHERE clause, comparison operators, logical operators, BETWEEN, IN, LIKE, IS NULL, date functions, JOINs, HAVING)

## Sources Consulted
- MySQL 8.0 Reference Manual: SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: WHERE Clause Optimization — https://dev.mysql.com/doc/refman/8.0/en/where-optimization.html
- MySQL 8.0 Reference Manual: Comparison Functions and Operators — https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html
- MySQL 8.0 Reference Manual: Logical Operators — https://dev.mysql.com/doc/refman/8.0/en/logical-operators.html
- MySQL 8.0 Reference Manual: String Comparison Functions (LIKE) — https://dev.mysql.com/doc/refman/8.0/en/string-comparison-functions.html
- MySQL 8.0 Reference Manual: Working with NULL Values — https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html
- MySQL 8.0 Reference Manual: Date and Time Functions — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual: GROUP BY Modifiers (HAVING) — https://dev.mysql.com/doc/refman/8.0/en/group-by-modifiers.html

## Issues Found
No technical issues found.

## Review Notes
- The HAVING clause example uses a column alias (`avg_salary`) rather than repeating the aggregate function (`AVG(salary)`). This works in MySQL as a MySQL-specific extension to standard SQL, but would fail in other databases like PostgreSQL or SQL Server. Since the post is MySQL-specific, this is correct as written.
- The note about `= NULL` not working is a valuable inclusion — this is a common beginner mistake and the explanation is accurate.
- Using `DATE(created_at)` for exact date matching prevents index usage on the `created_at` column. This is technically correct but a performance consideration readers should be aware of.
