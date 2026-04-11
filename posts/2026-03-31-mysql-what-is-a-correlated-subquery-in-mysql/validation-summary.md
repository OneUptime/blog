# Validation Summary: What Is a Correlated Subquery in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (correlated subqueries, EXISTS/NOT EXISTS, EXPLAIN, JOINs, derived tables)
- SQL (standard subquery patterns, aggregation, scalar subqueries)

## Sources Consulted
- MySQL 8.0 Reference Manual — Subqueries: https://dev.mysql.com/doc/refman/8.0/en/subqueries.html
- MySQL 8.0 Reference Manual — Correlated Subqueries: https://dev.mysql.com/doc/refman/8.0/en/correlated-subqueries.html
- MySQL 8.0 Reference Manual — EXISTS and NOT EXISTS: https://dev.mysql.com/doc/refman/8.0/en/exists-and-not-exists-subqueries.html
- MySQL 8.0 Reference Manual — EXPLAIN Output Format (select_type values): https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual — Optimizing Subqueries with Semi-Join Transformations: https://dev.mysql.com/doc/refman/8.0/en/semijoins.html

## Issues Found
No technical issues found.

## Review Notes
- The statement that correlated subqueries "run once per outer row" is a pedagogical simplification. MySQL 8.0+ can optimize certain correlated subqueries (particularly EXISTS) into semi-joins, meaning they don't always execute literally once per row. The post appropriately hedges with "potentially slow" and "can be slow," so this is acceptable for a tutorial.
- The JOIN rewrite section correctly uses DISTINCT to handle the one-to-many relationship between customers and orders. Worth noting that in MySQL 8.0+, the optimizer may already transform the EXISTS pattern into a semi-join internally, so the performance difference may be negligible in practice.
- All SQL examples are syntactically correct and use standard MySQL syntax compatible with MySQL 5.7+.
