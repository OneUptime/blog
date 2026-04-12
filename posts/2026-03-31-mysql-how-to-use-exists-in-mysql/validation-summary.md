# Validation Summary: How to Use EXISTS in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (EXISTS operator, subqueries, correlated subqueries)
- SQL (SELECT, UPDATE, DELETE with EXISTS/NOT EXISTS)

## Sources Consulted
- MySQL 8.0 Reference Manual — EXISTS and NOT EXISTS subqueries: https://dev.mysql.com/doc/refman/8.0/en/exists-and-not-exists-subqueries.html
- MySQL 8.0 Reference Manual — UPDATE syntax: https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.0 Reference Manual — DELETE syntax: https://dev.mysql.com/doc/refman/8.0/en/delete.html
- MySQL 8.0 Reference Manual — Optimizing subqueries with EXISTS: https://dev.mysql.com/doc/refman/8.0/en/subquery-optimization-with-exists.html

## Issues Found
No technical issues found.

## Review Notes
- The DELETE with alias syntax (`DELETE FROM products p WHERE ...`) requires MySQL 8.0.16 or later. The post does not specify a MySQL version, but this is acceptable for a modern tutorial since 8.0.16 was released in 2019.
- The `YEAR(o.order_date) = YEAR(CURDATE())` pattern in the "Combining EXISTS" example is correct but prevents index usage on the `order_date` column. A range-based condition (e.g., `o.order_date >= '2026-01-01'`) would be more performant. This is an optimization concern, not a correctness issue.
- The EXISTS vs IN comparison is a useful simplification for a tutorial audience. In practice, MySQL's optimizer (especially 8.0+) can often transform between semi-join strategies, so the performance difference is less pronounced than described.
