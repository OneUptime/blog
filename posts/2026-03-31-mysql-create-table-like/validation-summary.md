# Validation Summary: How to Copy a Table Structure with CREATE TABLE LIKE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- SQL DDL (CREATE TABLE, ALTER TABLE, RENAME TABLE)
- CREATE TABLE ... LIKE syntax
- INSERT INTO ... SELECT pattern

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE ... LIKE Statement: https://dev.mysql.com/doc/refman/8.0/en/create-table-like.html
- MySQL 8.0 Reference Manual — CREATE TABLE and Foreign Keys: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual — RENAME TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/rename-table.html
- MySQL 8.0 Reference Manual — CREATE TEMPORARY TABLE: https://dev.mysql.com/doc/refman/8.0/en/create-table.html

## Issues Found
1. **Missing implicit FK index in `orders_copy` SHOW CREATE TABLE output** — When a foreign key constraint is defined on a column (e.g., `user_id`), MySQL automatically creates an index on that column. `CREATE TABLE ... LIKE` copies all indexes but does NOT copy the FK constraint itself. The original output for `orders_copy` omitted the `KEY fk_orders_user (user_id)` line, showing only the PRIMARY KEY. This was misleading because it implied the index was also not copied. Fixed the output to include the index and updated the annotation comment to clarify that the index is copied but the constraint is not.

## Review Notes
- The "Combining LIKE with INSERT INTO SELECT" section references `WHERE YEAR(created_at) = 2023` on the `orders` table, but the `orders` table defined earlier in the post has no `created_at` column. This is not an error per se — the examples in each section are meant to illustrate patterns independently — but readers following along sequentially may be confused. No change made since the SQL syntax is correct for a table that has such a column.
- The post correctly notes that views and triggers are not copied by `CREATE TABLE ... LIKE`, which aligns with official MySQL documentation.
- The atomic swap pattern using `RENAME TABLE` is correctly demonstrated.
