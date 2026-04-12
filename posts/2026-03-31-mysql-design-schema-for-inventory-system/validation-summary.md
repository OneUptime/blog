# Validation Summary: How to Design a Schema for an Inventory System in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DDL: CREATE TABLE, triggers, indexes, foreign keys)
- SQL querying (GROUP BY with functional dependencies, HAVING, aggregation)
- Inventory management schema design patterns (ledger/summary table pattern)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: CREATE TRIGGER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual: ONLY_FULL_GROUP_BY and Functional Dependencies — https://dev.mysql.com/doc/refman/8.0/en/group-by-functional-dependence.html
- MySQL 8.0 Reference Manual: Automatic Initialization and Updating for TIMESTAMP and DATETIME — https://dev.mysql.com/doc/refman/8.0/en/timestamp-initialization.html

## Issues Found
No technical issues found.

## Review Notes
- The `GROUP BY p.id` clauses in the final queries select non-aggregated columns (`p.sku`, `p.name`, `p.reorder_qty`) that are not in the GROUP BY. This is valid in MySQL 5.7.5+ due to functional dependency detection (grouping by a primary key allows selecting other columns from the same table). Readers using MySQL 5.6 or earlier, or databases with custom `sql_mode` settings disabling this, may encounter errors.
- The trigger adds `NEW.quantity` directly to `stock_levels.quantity`. This implicitly requires the convention that outgoing movements (shipments) use negative quantity values. The `stock_movements.quantity` column is signed `INT`, so this works, but the post could benefit from a brief note about this convention.
- The schema has no `ON DELETE` action specified for foreign keys in `stock_levels` and `stock_movements`, which defaults to `RESTRICT` — a reasonable choice for inventory data integrity.
