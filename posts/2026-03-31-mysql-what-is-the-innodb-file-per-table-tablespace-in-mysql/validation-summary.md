# Validation Summary: What Is the InnoDB File-Per-Table Tablespace in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (5.6.6+ and 8.0+)
- InnoDB storage engine
- InnoDB file-per-table tablespace
- InnoDB system tablespace
- information_schema views

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB File-Per-Table Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-file-per-table-tablespaces.html
- MySQL 8.0 Reference Manual: innodb_file_per_table system variable — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_file_per_table
- MySQL 8.0 Reference Manual: INNODB_TABLESPACES table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 8.0 Reference Manual: Transportable Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-table-import.html
- MySQL 8.0 Reference Manual: Data Dictionary — https://dev.mysql.com/doc/refman/8.0/en/data-dictionary.html
- MySQL 8.0 Reference Manual: OPTIMIZE TABLE — https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html

## Issues Found

1. **"MySQL creates two files" was inaccurate for MySQL 8.0**: The text stated "MySQL creates two files" but the `.frm` file only exists in MySQL 5.x. In MySQL 8.0, only the `.ibd` file is created because the data dictionary replaces `.frm` files. Changed wording from "two files" to "the following files" and added a clarifying sentence about MySQL 8.0 behavior.

2. **"Checking Which Tablespace a Table Uses" query was misleading**: The original query used `CREATE_OPTIONS` from `information_schema.TABLES` and claimed that file-per-table tables have an "empty" field while system tablespace tables "show nothing" — both are effectively the same (empty), making the query useless for distinguishing tablespace types. Replaced with a query against `information_schema.INNODB_TABLESPACES` (MySQL 8.0+), which provides a clear `SPACE_TYPE` column showing `Single` for file-per-table and `General` for general tablespaces.

## Review Notes
- The post correctly notes that `innodb_file_per_table` has been ON by default since MySQL 5.6.6.
- All SQL syntax (CREATE TABLE, ALTER TABLE, SHOW VARIABLES, SET GLOBAL, OPTIMIZE TABLE, FLUSH TABLES FOR EXPORT) is correct.
- The `my.cnf` configuration format is correct.
- The explanation of how OPTIMIZE TABLE works for InnoDB (internally mapped to ALTER TABLE ... FORCE) and reclaims space for file-per-table tablespaces is accurate.
- The transportable tablespaces workflow (FLUSH TABLES ... FOR EXPORT, copy .ibd and .cfg files) is correct.
- The disadvantages listed are accurate and well-balanced.
- The INNODB_TABLESPACES query replacement is MySQL 8.0+ specific. For MySQL 5.7, the equivalent would be `information_schema.INNODB_SYS_TABLESPACES`, but since 5.7 reached end-of-life in October 2023, the 8.0+ approach is appropriate.
