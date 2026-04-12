# Validation Summary: How to Use DROP INDEX Statement in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- MySQL DDL (DROP INDEX, ALTER TABLE)
- MySQL information_schema and performance_schema

## Sources Consulted
- MySQL 8.0 Reference Manual: DROP INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/drop-index.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: Online DDL Operations (Index Operations) — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html#online-ddl-index-operations
- MySQL 8.0 Reference Manual: Invisible Indexes — https://dev.mysql.com/doc/refman/8.0/en/invisible-indexes.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA STATISTICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html

## Issues Found

1. **Incorrect claim about table rebuild when dropping indexes**: The intro paragraph stated "MySQL requires you to rebuild the table internally when dropping an index, so this operation can be slow on large tables." This is incorrect for InnoDB (the default storage engine since MySQL 5.5.5). Dropping a secondary index in InnoDB is an in-place operation (`ALGORITHM=INPLACE`) that does NOT require a table rebuild. Only dropping a primary key requires a full table rebuild. Fixed to clarify this distinction.

2. **Incorrect comma syntax in DROP INDEX with ALGORITHM/LOCK**: The example `DROP INDEX idx_customer_id ON orders ALGORITHM=INPLACE, LOCK=NONE;` used a comma between ALGORITHM and LOCK clauses. The `DROP INDEX` statement takes these as space-separated options (not comma-separated). Commas are only used in the `ALTER TABLE` form where ALGORITHM and LOCK are listed as alter_options. Fixed by removing the comma: `DROP INDEX idx_customer_id ON orders ALGORITHM=INPLACE LOCK=NONE;`.

## Review Notes
- The `ALTER TABLE ... DROP INDEX IF EXISTS` syntax was added in MySQL 8.0.29. The post mentions it is "available via ALTER TABLE" without specifying the minimum version. This is acceptable but readers on older MySQL 8.0.x versions may encounter errors.
- The post correctly notes that the `ALTER TABLE` form uses commas (e.g., `ALTER TABLE orders DROP INDEX idx_old_col, ALGORITHM=INPLACE, LOCK=NONE;`), which is consistent with ALTER TABLE syntax where ALGORITHM and LOCK are alter_options.
