# Validation Summary: How to Manage MySQL InnoDB Tablespaces

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0
- InnoDB Storage Engine
- InnoDB Tablespaces (system, file-per-table, general, undo, temporary)
- information_schema views (INNODB_TABLESPACES, FILES, TABLES)

## Sources Consulted
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA INNODB_TABLESPACES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 8.0 Reference Manual: InnoDB Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-tablespace.html
- MySQL 8.0 Reference Manual: General Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/general-tablespaces.html
- MySQL 8.0 Reference Manual: Undo Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-undo-tablespaces.html
- MySQL 8.0 Reference Manual: Transportable Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-table-import.html
- MySQL 8.0 Reference Manual: innodb_file_per_table — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_file_per_table

## Issues Found
1. **Incorrect column names in undo tablespace query**: The query `SELECT space_name, file_name, space_type, state FROM information_schema.INNODB_TABLESPACES WHERE space_type = 'Undo'` used non-existent column names. The `INNODB_TABLESPACES` table has `NAME` (not `space_name`) and does not have a `file_name` column at all (`FILE_NAME` exists in the related `INNODB_DATAFILES` table). Fixed to `SELECT name, space_type, state FROM information_schema.INNODB_TABLESPACES WHERE space_type = 'Undo'`.

2. **Incorrect terminology in best practices**: "Use tablespace import/export for fast, logical table migrations between servers" described transportable tablespaces as "logical" migrations. Transportable tablespaces are file-level (physical) operations, not SQL-level (logical) operations like mysqldump. Changed "logical" to "physical".

## Review Notes
- The first INNODB_TABLESPACES query (in the "Viewing Tablespace Information" section) correctly uses `space`, `name`, `space_type` etc., making the undo query's use of `space_name` an inconsistency within the post itself.
- The post correctly notes that `innodb_file_per_table` has been enabled by default since MySQL 5.6.6.
- The tablespace import/export workflow is correctly described (FLUSH TABLE FOR EXPORT, copy .ibd/.cfg, DISCARD/IMPORT TABLESPACE).
- The CREATE/ALTER/DROP UNDO TABLESPACE syntax is correct for MySQL 8.0.14+.
- All other SQL queries, configuration snippets, and technical explanations are accurate.
