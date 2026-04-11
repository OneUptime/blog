# Validation Summary: How to Use the io_global_by_file_by_bytes View in MySQL sys Schema

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL sys schema (`sys.io_global_by_file_by_bytes`, `sys.io_global_by_file_by_latency`)
- MySQL Performance Schema (`performance_schema.file_summary_by_instance`)
- InnoDB file I/O internals (tablespace files, redo logs, binary logs)

## Sources Consulted
- MySQL 8.0 Reference Manual — sys.io_global_by_file_by_bytes: https://dev.mysql.com/doc/refman/8.0/en/sys-io-global-by-file-by-bytes.html
- MySQL 8.0 Reference Manual — sys.io_global_by_file_by_latency: https://dev.mysql.com/doc/refman/8.0/en/sys-io-global-by-file-by-latency.html
- MySQL 8.0 Reference Manual — Performance Schema file summary tables: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-file-summary-tables.html
- MySQL 8.0 Reference Manual — InnoDB redo log: https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html

## Issues Found
No technical issues found.

All column names for `sys.io_global_by_file_by_bytes` (`file`, `count_read`, `total_read`, `avg_read`, `count_write`, `total_written`, `avg_write`, `total`, `write_pct`) match the official documentation exactly. The `write_pct` column is numeric, so the `WHERE write_pct > 70` filter is valid. The `sys.io_global_by_file_by_latency` companion view columns are correct. The `performance_schema.file_summary_by_instance` column names (`FILE_NAME`, `COUNT_READ`, `SUM_NUMBER_OF_BYTES_READ`, `COUNT_WRITE`, `SUM_NUMBER_OF_BYTES_WRITE`) are all accurate. The tuning advice for `sync_binlog`, `binlog_cache_size`, and `innodb_log_file_size` is sound.

## Review Notes
- **MySQL 8.0.30+ redo log changes**: Starting with MySQL 8.0.30, `innodb_log_file_size` is deprecated in favor of `innodb_redo_log_capacity`. The post recommends increasing `innodb_log_file_size` for redo log pressure, which is correct for MySQL < 8.0.30 but may need updating for newer installations. Similarly, redo log files changed naming from `ib_logfile*` to `#ib_redo*` files in a `#innodb_redo` subdirectory in 8.0.30+.
- The post does not specify a target MySQL version. All content is accurate for MySQL 5.7 through 8.0.29. For 8.0.30+, the redo log advice in the "Practical Use Cases" section would benefit from mentioning `innodb_redo_log_capacity` as the modern replacement.
