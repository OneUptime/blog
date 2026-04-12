# Validation Summary: How to Fix ERROR 1217 Cannot Delete a Parent Row in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB foreign key constraints)
- SQL (DDL and DML)
- information_schema system tables

## Sources Consulted
- MySQL 8.0 Reference Manual — Server Error Message Reference (ERROR 1217, ER_ROW_IS_REFERENCED): https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html
- MySQL 8.0 Reference Manual — FOREIGN KEY Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual — ALTER TABLE Foreign Key syntax: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — SET FOREIGN_KEY_CHECKS: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_foreign_key_checks
- MySQL 8.0 Reference Manual — information_schema.KEY_COLUMN_USAGE: https://dev.mysql.com/doc/refman/8.0/en/information-schema-key-column-usage-table.html

## Issues Found
No technical issues found.

## Review Notes
- The post correctly notes that ON DELETE RESTRICT and ON DELETE NO ACTION are equivalent in MySQL (both check constraints immediately, unlike PostgreSQL where NO ACTION can be deferred within a transaction).
- Fix 3 (ON DELETE SET NULL) correctly includes the often-overlooked step of making the column nullable before adding the SET NULL constraint — a common source of errors in practice.
- The orphan-check query in Fix 4 (`NOT IN` subquery) works correctly assuming `id` is a non-nullable primary key, which is the standard case.
- Note that in modern MySQL (5.x+), row-level DELETE operations typically raise ERROR 1451 (ER_ROW_IS_REFERENCED_2) which includes constraint details in the message. ERROR 1217 is more commonly seen with DDL operations like DROP TABLE. However, the base error message is identical, and all solutions presented are valid for both error scenarios.
