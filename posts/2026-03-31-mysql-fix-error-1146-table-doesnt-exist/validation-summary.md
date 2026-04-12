# Validation Summary: How to Fix ERROR 1146 Table Doesn't Exist in MySQL

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MySQL (5.x and 8.0+)
- InnoDB storage engine
- MySQL information_schema
- Python (debugging example)

## Sources Consulted
- MySQL 8.0 Reference Manual — IMPORT TABLESPACE: https://dev.mysql.com/doc/refman/8.0/en/innodb-discard-import-tablespace.html
- MySQL 8.0 Reference Manual — lower_case_table_names: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_lower_case_table_names
- MySQL 8.0 Reference Manual — SHOW TABLES: https://dev.mysql.com/doc/refman/8.0/en/show-tables.html
- MySQL 8.0 Reference Manual — information_schema.TABLES: https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual — Server Error Message Reference (ERROR 1146): https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html

## Issues Found

### Issue 1: Step 5 — IMPORT TABLESPACE without existing table definition
**What was wrong:** The post suggested running `ALTER TABLE myapp.tablename IMPORT TABLESPACE` directly to fix an InnoDB data dictionary mismatch. However, if the table does not exist in MySQL's data dictionary (which is the case when ERROR 1146 is raised), ALTER TABLE will also fail with ERROR 1146. The table must first be created in the dictionary before a tablespace can be imported.

**What was changed:** Added the prerequisite `CREATE TABLE` and `DISCARD TABLESPACE` steps before `IMPORT TABLESPACE`, matching the correct procedure documented in the MySQL manual for transportable tablespaces.

### Issue 2: Step 6 — Missing CREATE TABLE before DISCARD/IMPORT TABLESPACE
**What was wrong:** The backup restoration procedure started with `ALTER TABLE tablename DISCARD TABLESPACE`, but if only .ibd files were restored without dictionary entries, the table does not exist in MySQL and DISCARD TABLESPACE would fail with ERROR 1146.

**What was changed:** Added a `CREATE TABLE` step before DISCARD TABLESPACE, so the table exists in the data dictionary before attempting tablespace operations.

## Review Notes
- The .frm file discussion in Step 4 is correctly scoped to MySQL 5.x. In MySQL 8.0, .frm files were replaced by the transactional data dictionary. Readers using MySQL 8.0+ should note that orphaned .frm files are not applicable to their version.
- The Python debugging example in Step 7 uses an f-string to construct the query with a hardcoded table name and a `%s` placeholder for parameters. This is acceptable for the debugging purpose shown, though readers should be aware that interpolating table names via f-strings in production code could be a SQL injection risk if the table name comes from user input.
