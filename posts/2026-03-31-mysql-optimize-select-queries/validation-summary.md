# Validation Summary: How to Optimize SELECT Queries in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (SELECT query optimization)
- MySQL EXPLAIN
- MySQL indexing (composite indexes, covering indexes)
- MySQL query patterns (JOINs, subqueries, pagination, aggregation)

## Sources Consulted
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual — Optimizing SELECT Statements: https://dev.mysql.com/doc/refman/8.0/en/select-optimization.html
- MySQL 8.0 Reference Manual — Covering Indexes: https://dev.mysql.com/doc/refman/8.0/en/glossary.html#glos_covering_index
- MySQL 8.0 Reference Manual — ORDER BY Optimization: https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html
- MySQL 8.0 Reference Manual — Optimizing Subqueries with Joins: https://dev.mysql.com/doc/refman/8.0/en/rewriting-subqueries.html
- MySQL 8.0 Reference Manual — GROUP BY Optimization: https://dev.mysql.com/doc/refman/8.0/en/group-by-optimization.html

## Issues Found
1. **Correlated subquery to JOIN rewrite used INNER JOIN instead of LEFT JOIN**: The scalar subquery `(SELECT name FROM customers WHERE id = o.customer_id)` returns NULL when no matching customer exists, which is semantically equivalent to a LEFT JOIN. The original rewrite used `JOIN` (INNER JOIN), which would silently drop orders that have no matching customer row, changing the result set. Fixed by changing `JOIN` to `LEFT JOIN`.

## Review Notes
- The illustrative EXPLAIN comment `-- type: ref, Using index condition` in the composite index section is reasonable but the exact Extra output depends on the MySQL version and table structure. The core point (type changes from ALL to ref, filesort is eliminated) is accurate.
- The covering index example `(category_id, id, name, price)` explicitly includes `id`, which is redundant for InnoDB since the primary key is always appended to secondary indexes. This is not wrong, just slightly redundant — and arguably clearer for readers.
- MySQL 8.0.13+ supports functional indexes (e.g., `CREATE INDEX idx ON orders ((YEAR(created_at)))`) which could allow index use with `YEAR(created_at) = 2025`. The post's advice to use range conditions instead remains the better general approach and is correct for all MySQL versions.
- All SQL syntax is correct and all examples would work as described.
