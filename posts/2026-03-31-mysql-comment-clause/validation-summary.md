# Validation Summary: How to Use the COMMENT Clause for Tables and Columns in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DDL, COMMENT clause, ALTER TABLE, CREATE TABLE)
- MySQL Information Schema (TABLES, COLUMNS views)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: SHOW CREATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/show-create-table.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA COLUMNS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html

## Issues Found
No technical issues found.

## Review Notes
- The comment length limits (2048 for tables, 1024 for columns) are correct for MySQL 8.0 and InnoDB. Other storage engines may have different limits.
- The post correctly notes that `MODIFY COLUMN` requires the full column definition. An alternative approach using `ALTER TABLE ... CHANGE COLUMN` exists but omitting it is not an error.
- The `SHOW CREATE TABLE` example output correctly reflects MySQL's behavior of normalizing type names to lowercase and separating `PRIMARY KEY` into its own constraint line.
- `DEFAULT CURRENT_TIMESTAMP` on `DATETIME` columns requires MySQL 5.6.5+; this is not an issue for any supported MySQL version today.
