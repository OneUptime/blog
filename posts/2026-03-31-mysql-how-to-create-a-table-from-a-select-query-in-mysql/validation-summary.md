# Validation Summary: How to Create a Table from a SELECT Query in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CREATE TABLE ... AS SELECT / CTAS)
- SQL DDL (Data Definition Language)
- SQL DML (INSERT INTO ... SELECT)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE ... SELECT Statement (https://dev.mysql.com/doc/refman/8.0/en/create-table-select.html)
- MySQL 8.0 Reference Manual: CREATE TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/create-table.html)
- MySQL 8.0 Reference Manual: CREATE TEMPORARY TABLE (https://dev.mysql.com/doc/refman/8.0/en/create-table.html#create-table-temporary)
- MySQL 8.0 Reference Manual: ALTER TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/alter-table.html)

## Issues Found
- **Incorrect behavior description for `CREATE TABLE IF NOT EXISTS ... SELECT`**: The post claimed "if it exists, data will still be inserted - it does not skip the whole statement." This is incorrect for MySQL 8.0+. When the table already exists, MySQL does NOT insert any data — the entire statement is effectively a no-op and MySQL issues a note (not an error). Fixed the description to accurately reflect this behavior.

## Review Notes
- All SQL syntax examples are correct and use valid MySQL syntax.
- The explanation that CTAS does not copy indexes, primary keys, foreign keys, or constraints is accurate.
- The `WHERE 1=0` trick for copying structure without data is a well-known valid approach.
- The ALTER TABLE example for adding back AUTO_INCREMENT and PRIMARY KEY after CTAS is correct.
- The comparison between CTAS and INSERT INTO ... SELECT is accurate.
- The temporary table example and session-scoping explanation are correct.
