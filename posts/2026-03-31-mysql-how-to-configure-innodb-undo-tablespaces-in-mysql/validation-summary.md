# Validation Summary: How to Configure InnoDB Undo Tablespaces in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- InnoDB undo tablespaces
- MVCC (Multi-Version Concurrency Control)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Undo Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-undo-tablespaces.html
- MySQL 8.0 Reference Manual: `innodb_undo_log_truncate` — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_undo_log_truncate
- MySQL 8.0 Reference Manual: `innodb_max_undo_log_size` — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_max_undo_log_size
- MySQL 8.0 Reference Manual: `innodb_purge_rseg_truncate_frequency` — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_purge_rseg_truncate_frequency
- MySQL 8.0 Reference Manual: `information_schema.INNODB_TABLESPACES` — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 8.0 Reference Manual: CREATE UNDO TABLESPACE — https://dev.mysql.com/doc/refman/8.0/en/create-tablespace.html
- MySQL 8.0 Reference Manual: ALTER UNDO TABLESPACE — https://dev.mysql.com/doc/refman/8.0/en/alter-tablespace.html

## Issues Found
1. **Incorrect column name in monitoring query**: The query against `information_schema.INNODB_TABLESPACES` used `SIZE` which is not a valid column. The correct column is `FILE_SIZE`. Changed `ROUND(SIZE / 1024 / 1024, 2)` to `ROUND(FILE_SIZE / 1024 / 1024, 2)`.

## Review Notes
- `innodb_undo_log_truncate` defaults to ON starting from MySQL 8.0.2. The post frames it as something to "enable," which is technically fine (explicitly setting it is valid practice), but readers should know it is already ON by default in MySQL 8.0.2+.
- The `innodb_undo_directory` description says it "applies only at initialization time when creating new undo tablespaces." More precisely, it is a non-dynamic (startup-only) variable, but it also serves as the default directory for undo tablespaces created later via `CREATE UNDO TABLESPACE` when a relative path or filename-only is specified.
- All SQL syntax (`CREATE UNDO TABLESPACE`, `ALTER UNDO TABLESPACE ... SET INACTIVE`, `DROP UNDO TABLESPACE`) is correct for MySQL 8.0.14+.
- The `.ibu` file extension for undo tablespace files is correct.
- The threshold of 100,000 for history list length is a reasonable operational guideline, though not an official MySQL threshold.
