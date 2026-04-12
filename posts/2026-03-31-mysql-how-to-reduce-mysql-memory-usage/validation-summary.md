# Validation Summary: How to Reduce MySQL Memory Usage

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- MySQL sys schema
- MySQL Performance Schema
- MySQL server configuration (my.cnf / mysqld options)
- Linux process monitoring (ps, watch, pgrep)

## Sources Consulted
- MySQL 8.0 Reference Manual: sys schema views (`sys.memory_global_by_current_bytes` and `x$` equivalents) - https://dev.mysql.com/doc/refman/8.0/en/sys-memory-global-by-current-bytes.html
- MySQL 8.0 Reference Manual: Performance Schema memory summary tables - https://dev.mysql.com/doc/refman/8.0/en/performance-schema-memory-summary-tables.html
- MySQL 8.0 Reference Manual: InnoDB startup options (innodb_buffer_pool_size, innodb_log_buffer_size) - https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual: Server system variables (sort_buffer_size, read_buffer_size, join_buffer_size, etc.) - https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: Performance Schema setup_consumers table - https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-consumers-table.html

## Issues Found

1. **Incorrect view for arithmetic on memory totals (line 34)**: The query `SUM(current_alloc) / 1024 / 1024` was using `sys.memory_global_by_current_bytes`, but the `current_alloc` column in that view is a human-readable formatted string (e.g., "128.00 MiB") produced by `sys.format_bytes()`. Arithmetic on a string column would fail or produce incorrect results. Changed to `sys.x$memory_global_by_current_bytes`, which provides raw numeric byte values suitable for arithmetic.

2. **Wrong column name on performance_schema table (lines 118-119)**: The query `SELECT * FROM performance_schema.memory_summary_global_by_event_name ORDER BY current_alloc DESC` referenced a non-existent column `current_alloc`. The `performance_schema.memory_summary_global_by_event_name` table uses `CURRENT_NUMBER_OF_BYTES_USED`, not `current_alloc`. Changed the table to `sys.memory_global_by_current_bytes` where `current_alloc` is a valid column, which also provides more readable output.

3. **Wrong column names in monitoring query (lines 143-150)**: The monitoring query selected `current_alloc` and `high_alloc` from `performance_schema.memory_summary_global_by_event_name`, but those columns don't exist in that table (they are `CURRENT_NUMBER_OF_BYTES_USED` and `HIGH_NUMBER_OF_BYTES_USED`). Changed the table to `sys.x$memory_global_by_current_bytes` where `current_alloc` and `high_alloc` are valid column names with raw numeric values appropriate for monitoring.

## Review Notes
- The default values cited for per-thread buffers (sort_buffer_size, read_buffer_size, etc.) are accurate for MySQL 8.0. These defaults may differ on some Linux distributions that ship custom MySQL configurations.
- The recommendation of 70-80% of RAM for the InnoDB buffer pool is standard advice for dedicated database servers, and the post correctly notes this should be reduced when other processes share the server.
- Disabling Performance Schema (`performance_schema = OFF`) requires a server restart; the post doesn't explicitly mention this but it's implied by the `[mysqld]` config file context.
- The `sys` schema views used in this post require the `sys` schema to be installed, which is included by default in MySQL 5.7+ but may not be present on very old or minimal installations.
