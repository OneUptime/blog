# Validation Summary: How to Tune MySQL for Write-Heavy Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0 (including 8.0.30+ redo log changes)
- InnoDB storage engine
- MySQL Performance Schema

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Redo Log — https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html
- MySQL 8.0 Reference Manual: innodb_flush_log_at_trx_commit — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_flush_log_at_trx_commit
- MySQL 8.0 Reference Manual: sync_binlog — https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html#sysvar_sync_binlog
- MySQL 8.0 Reference Manual: innodb_io_capacity — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_io_capacity
- MySQL 8.0 Reference Manual: innodb_flush_method — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_flush_method
- MySQL 8.0 Reference Manual: innodb_read_io_threads / innodb_write_io_threads — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_write_io_threads
- MySQL 8.0 Reference Manual: LOAD DATA INFILE — https://dev.mysql.com/doc/refman/8.0/en/load-data.html
- MySQL 8.0 Reference Manual: Performance Schema global_status — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html

## Issues Found
- **Misleading `sync_binlog` comment**: The comment read `# sync_binlog = 0 reduces binary log sync overhead` while the actual configured value was `sync_binlog = 100`. This was confusing because the comment described a different value than the one set. Fixed the comment to accurately describe the configured value: `# sync_binlog = 100: sync binary log every 100 commits (balances safety and performance)`.

## Review Notes
- The `innodb_flush_method = O_DIRECT` recommendation is Linux-specific. On Windows, MySQL uses `unbuffered` by default, and on macOS the behavior differs. The post does not note this, but since production MySQL is almost universally on Linux, this is acceptable.
- The `innodb_log_file_size` and `innodb_log_files_in_group` variables shown for pre-8.0.30 were deprecated in 8.0.30 and removed in MySQL 8.0.34. The post correctly scopes them to older versions but does not mention the removal in 8.0.34.
- All InnoDB variable names, Performance Schema table/column names, SQL syntax, and configuration formats are correct.
- The 15-20 minute redo log sizing rule of thumb is a widely cited best practice consistent with Oracle/MySQL documentation guidance.
