# Validation Summary: How to Configure innodb_file_per_table in MySQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (5.6+, 8.0)
- InnoDB storage engine
- InnoDB file-per-table tablespace management
- Percona XtraBackup (mentioned)

## Sources Consulted
- MySQL 8.0 Reference Manual: innodb_file_per_table — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_file_per_table
- MySQL 8.0 Reference Manual: InnoDB File-Per-Table Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-file-per-table-tablespaces.html
- MySQL 8.0 Reference Manual: Transportable Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-table-import.html
- MySQL 8.0 Reference Manual: INNODB_TABLESPACES table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 8.0 Reference Manual: FLUSH TABLES ... FOR EXPORT — https://dev.mysql.com/doc/refman/8.0/en/flush.html#flush-tables-for-export

## Issues Found

### 1. Invalid transportable tablespace command
- **What was wrong:** The post listed `innodb_transportable_tablespace_export` as a shell command for exporting a table for transport. This is not a valid MySQL command or shell utility.
- **What was changed:** Replaced with the correct SQL statement `FLUSH TABLES orders FOR EXPORT;` along with a note to copy the `.ibd` and `.cfg` files, which is the documented procedure for InnoDB transportable tablespaces.
- **Why:** The original pseudo-command would not work and could confuse readers. The correct approach uses `FLUSH TABLES ... FOR EXPORT` to quiesce the table and generate the `.cfg` metadata file needed for import.

### 2. Incorrect column name in INNODB_TABLESPACES query
- **What was wrong:** The query filtering `information_schema.INNODB_TABLESPACES` used `WHERE FILE_TYPE = 'SINGLE'`. The column `FILE_TYPE` does not exist in this table.
- **What was changed:** Replaced `FILE_TYPE = 'SINGLE'` with `SPACE_TYPE = 'Single'`, which is the correct column and value for filtering file-per-table tablespaces.
- **Why:** `SPACE_TYPE` is the actual column in `information_schema.INNODB_TABLESPACES` that indicates the tablespace type. Valid values are `Single` (file-per-table), `General`, and `System`.

## Review Notes
- The `innodb_file_per_table` variable was deprecated in MySQL 8.0.36 and MySQL 8.4. It still functions and defaults to ON, but readers targeting newer MySQL versions should be aware of this deprecation.
- The first query under "Checking Which Tablespace Each Table Uses" uses `CREATE_OPTIONS` from `information_schema.TABLES`, which does not directly show tablespace information for file-per-table tables. It works for tables explicitly created with a `TABLESPACE` clause but will show empty for default file-per-table tables. This is not incorrect but could be misleading; the second query using `INNODB_TABLESPACES` is the more reliable approach.
