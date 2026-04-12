# Validation Summary: How to Understand the type Column in EXPLAIN Output in MySQL

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL (8.0+)
- EXPLAIN query plan output
- MySQL indexing (B-tree, FULLTEXT, functional indexes)

## Sources Consulted
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: CREATE INDEX Statement (functional indexes) — https://dev.mysql.com/doc/refman/8.0/en/create-index.html

## Issues Found

1. **Incorrect `system` type example**: The original example `EXPLAIN SELECT @@version\G` does not produce `type: system`. Since `@@version` is a system variable and no table is accessed, MySQL returns `type: NULL` with `Extra: No tables used`. Replaced with `EXPLAIN SELECT * FROM (SELECT 1) AS t\G`, which materialises a single-row derived table and correctly produces `type: system`.

2. **Missing EXPLAIN types `unique_subquery` and `index_subquery`**: The section was titled "The Complete List" but omitted two official EXPLAIN type values. `unique_subquery` replaces `eq_ref` for `IN` subqueries against a primary key or unique index. `index_subquery` is similar but for non-unique indexes. Added both with descriptions and examples, placed in their correct position between `index_merge` and `range` per the MySQL documentation ordering.

3. **Misleading `eq_ref` comment**: The comment said "if customer_id is PK of customers", but the join condition is `ON o.customer_id = c.id` — the primary key being matched is `c.id`, not `customer_id` (which is a column in the orders table). Changed to "if c.id is PK of customers".

## Review Notes
- The `system` type is rare in practice; it requires a table (or materialised derived table) with exactly one row. In MySQL 8.0 with `derived_merge` enabled (the default), the optimizer may merge derived tables rather than materialise them, meaning the example may not always show `type: system` depending on the optimizer's decisions. This is an inherent difficulty in demonstrating this type.
- The functional index example (`ALTER TABLE orders ADD INDEX idx_status_lower ((LOWER(status)))`) is valid MySQL 8.0.13+ syntax. The post does not mention the version requirement, which could be noted in a future update.
- The `unique_subquery` and `index_subquery` types may not appear in MySQL 8.0.x when the optimizer rewrites `IN (SELECT ...)` into a semi-join. They are more commonly seen when semi-join optimisation is disabled or inapplicable.
