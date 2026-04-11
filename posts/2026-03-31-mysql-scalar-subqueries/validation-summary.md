# Validation Summary: How to Use Scalar Subqueries in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SQL syntax, subqueries, query optimization)
- SQL standard scalar subquery behavior

## Sources Consulted
- MySQL 8.0 Reference Manual — Subqueries: https://dev.mysql.com/doc/refman/8.0/en/subqueries.html
- MySQL 8.0 Reference Manual — Scalar Subqueries: https://dev.mysql.com/doc/refman/8.0/en/scalar-subqueries.html
- MySQL 8.0 Reference Manual — Subquery Errors: https://dev.mysql.com/doc/refman/8.0/en/subquery-errors.html
- MySQL 8.0 Reference Manual — EXPLAIN Output: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual — Hash Join Optimization: https://dev.mysql.com/doc/refman/8.0/en/hash-joins.html

## Issues Found
No technical issues found.

## Review Notes
- The mention of hash joins in the "Scalar subquery vs JOIN" section is accurate (MySQL 8.0.18+ supports hash joins), though for the specific indexed equi-join examples shown (`department_id` lookups), MySQL would more typically use nested-loop joins with index lookups. The general advice that JOINs are usually faster than correlated scalar subqueries is correct regardless of join strategy.
- The `\G` terminator in the EXPLAIN example is specific to the MySQL command-line client and will not work in all SQL tools. This is common convention in MySQL tutorials and not an error.
- All SQL examples are syntactically correct and demonstrate valid MySQL behavior across SELECT, WHERE, HAVING, and ORDER BY clauses.
