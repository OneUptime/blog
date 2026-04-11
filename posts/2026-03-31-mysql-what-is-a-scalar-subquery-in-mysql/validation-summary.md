# Validation Summary: What Is a Scalar Subquery in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (scalar subqueries, correlated subqueries, query optimization)
- SQL (SELECT, WHERE, HAVING, ORDER BY, INSERT with subqueries)

## Sources Consulted
- MySQL 8.0 Reference Manual — Scalar Subqueries: https://dev.mysql.com/doc/refman/8.0/en/scalar-subqueries.html
- MySQL 8.0 Reference Manual — Subquery Errors: https://dev.mysql.com/doc/refman/8.0/en/subquery-errors.html
- MySQL 8.0 Reference Manual — Optimizing Subqueries: https://dev.mysql.com/doc/refman/8.0/en/optimizing-subqueries.html
- MySQL 8.0 Reference Manual — Server Error Message Reference (ERROR 1242): https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL examples are syntactically correct and demonstrate valid scalar subquery usage in MySQL.
- The error code ERROR 1242 (SQLSTATE 21000) for "Subquery returns more than 1 row" is accurate.
- The performance advice about rewriting correlated scalar subqueries as JOINs with derived tables is sound. Worth noting that MySQL 8.0+ has improved subquery optimization (e.g., derived table merging), which may reduce the performance gap in some cases, but the JOIN rewrite remains a good general practice.
- The NULL behavior explanation (scalar subquery returning no rows evaluates to NULL) is correct per MySQL documentation.
