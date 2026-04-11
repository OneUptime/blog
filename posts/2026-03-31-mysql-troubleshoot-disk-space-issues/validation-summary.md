# Validation Summary: How to Troubleshoot MySQL Disk Space Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- MySQL binary logs
- MySQL information_schema views
- Linux disk utilities (df, du)

## Sources Consulted
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA INNODB_TABLESPACES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html)
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TABLES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html)
- MySQL 8.0 Reference Manual: OPTIMIZE TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html)
- MySQL 8.0 Reference Manual: PURGE BINARY LOGS Statement (https://dev.mysql.com/doc/refman/8.0/en/purge-binary-logs.html)
- MySQL 8.0 Reference Manual: binlog_expire_logs_seconds (https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html#sysvar_binlog_expire_logs_seconds)
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA INNODB_TRX Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html)

## Issues Found
1. **InnoDB Undo Log Space query used non-existent column `SIZE_IN_PAGES`**: The `information_schema.INNODB_TABLESPACES` table does not have a `SIZE_IN_PAGES` column. The correct column for tablespace size is `FILE_SIZE` (in bytes). Changed from `ROUND(SIZE_IN_PAGES * 16384 / 1024 / 1024, 2)` to `ROUND(FILE_SIZE / 1024 / 1024, 2)`.

2. **InnoDB Undo Log Space query used `STATE` column**: The `STATE` column was only added to `INNODB_TABLESPACES` in MySQL 8.0.31. Removed it to ensure broader compatibility across MySQL 8.0 versions.

3. **InnoDB Undo Log Space query used incorrect name filter**: The original `WHERE NAME LIKE 'undo%'` would not match default undo tablespace names, which are `innodb_undo_001`, `innodb_undo_002`, etc. Changed to `WHERE SPACE_TYPE = 'Undo'` which reliably identifies undo tablespaces regardless of naming.

## Review Notes
- The `binlog_expire_logs_seconds` variable was introduced in MySQL 8.0, replacing the deprecated `expire_logs_days`. The post doesn't mention this version requirement, which is fine since MySQL 8.0 is the current standard.
- The post correctly notes that OPTIMIZE TABLE on InnoDB internally maps to ALTER TABLE ... FORCE, so both approaches are functionally equivalent for space reclamation.
- The 259200 seconds value correctly equals 3 days (3 × 86400).
- All other SQL queries, bash commands, and technical explanations verified as accurate.
