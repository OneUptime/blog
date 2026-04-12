# Validation Summary: How to Add a Primary Key to a Table in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- InnoDB storage engine
- SQL DDL (ALTER TABLE, CREATE TABLE)
- INFORMATION_SCHEMA

## Sources Consulted
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: CREATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: Online DDL Operations — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual: SHOW INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/show-index.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA KEY_COLUMN_USAGE Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-key-column-usage-table.html

## Issues Found
No technical issues found.

## Review Notes
- The `HAVING cnt > 1` usage with a column alias is valid in MySQL (MySQL extends standard SQL to allow column aliases in HAVING), though some readers from other SQL backgrounds may find `HAVING COUNT(*) > 1` more portable. This is a stylistic choice, not an error.
- The Online DDL section correctly notes that adding a primary key requires a table rebuild in InnoDB since the primary key defines the clustered index. The `ALGORITHM=INPLACE, LOCK=NONE` hint is appropriate and the fallback guidance is accurate.
- The note about removing AUTO_INCREMENT before dropping a primary key is an important practical detail that is correctly included — MySQL requires AUTO_INCREMENT columns to be part of an index.
