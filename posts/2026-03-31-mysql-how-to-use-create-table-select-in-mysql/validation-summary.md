# Validation Summary: How to Use CREATE TABLE ... SELECT in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CREATE TABLE ... SELECT syntax)
- MySQL DDL (Data Definition Language)
- MySQL CREATE TABLE ... LIKE

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE ... SELECT Statement (https://dev.mysql.com/doc/refman/8.0/en/create-table-select.html)
- MySQL 8.0 Reference Manual: CREATE TABLE ... LIKE Statement (https://dev.mysql.com/doc/refman/8.0/en/create-table-like.html)
- MySQL 8.0 Reference Manual: CREATE TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/create-table.html)

## Issues Found

1. **NOT NULL incorrectly listed as not copied**: The post stated "constraints like PRIMARY KEY, UNIQUE, and NOT NULL are NOT copied." In MySQL, the NOT NULL attribute IS preserved for directly-selected columns — the nullability of the result column is inferred from the source. Only PRIMARY KEY, UNIQUE, indexes, AUTO_INCREMENT, and DEFAULT values are not carried over. Fixed the introductory paragraph, the limitations section, and the summary paragraph to correctly reflect this behavior.

2. **Inaccurate limitation about cross-database table creation**: Limitation #5 stated "Cannot create a table in a different database in some configurations." This is incorrect — MySQL supports `CREATE TABLE other_db.new_table SELECT ...` using qualified table names. The only restriction is standard privilege requirements. Replaced with a more accurate limitation: DEFAULT values and column comments are not preserved.

## Review Notes
- The LIKE comparison section notes that LIKE copies "constraints," which is mostly accurate but FOREIGN KEY definitions are not preserved by LIKE. This is an acceptable simplification for the scope of the post.
- All SQL syntax examples are correct and use valid MySQL 8.0 syntax.
- The `IF NOT EXISTS` behavior is correctly implied — in MySQL 5.5.6+, if the table already exists, the statement is a no-op (no data is inserted).
- The `CREATE TEMPORARY TABLE ... SELECT` usage is correct.
- The pattern of combining LIKE + INSERT ... SELECT for full copies is a valid and commonly recommended best practice.
