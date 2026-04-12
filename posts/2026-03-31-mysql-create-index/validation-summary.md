# Validation Summary: How to Create an Index in MySQL with CREATE INDEX

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- SQL (CREATE INDEX, ALTER TABLE, EXPLAIN, SHOW INDEX)
- InnoDB B-tree indexes
- Online DDL

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE INDEX Statement: https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual — ALTER TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — Online DDL Operations: https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual — DROP INDEX Statement: https://dev.mysql.com/doc/refman/8.0/en/drop-index.html
- MySQL 8.0 Reference Manual — ELT Function: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_elt

## Issues Found
1. **"Two ways" should be "multiple ways"**: The Syntax section stated "There are two ways to create an index" but then showed three methods (CREATE INDEX, ALTER TABLE ADD INDEX, and inline INDEX during CREATE TABLE). Changed to "There are multiple ways to create an index."

## Review Notes
- The Drop an Index section shows both `DROP INDEX idx_email ON users;` and `ALTER TABLE users DROP INDEX idx_email;` in the same code block. The comment `-- Via ALTER TABLE` makes it clear these are alternatives, but running both sequentially would fail. This is a minor presentation concern, not a technical error.
- The data generation using CROSS JOIN of digit tables to produce 100 rows is correct and a well-known MySQL pattern.
- The EXPLAIN output correctly shows `type: ref` for a non-unique index lookup, which is accurate.
- Online DDL with `ALGORITHM=INPLACE, LOCK=NONE` is correctly documented as supported for secondary index creation in MySQL 8.0+.
- The post correctly notes that MySQL uses B-tree indexes by default (InnoDB technically uses B+ trees, but MySQL's own documentation refers to them as "B-tree" indexes).
- All SQL syntax is correct and consistent with MySQL 8.0 documentation.
