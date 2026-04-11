# Validation Summary: How to Use MySQL sys Schema for Performance Insights

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 5.7+ / 8.0
- MySQL sys schema (views, functions, procedures)
- MySQL performance_schema
- MySQL information_schema

## Sources Consulted
- MySQL 8.0 Reference Manual - sys Schema: https://dev.mysql.com/doc/refman/8.0/en/sys-schema.html
- MySQL 8.0 Reference Manual - statement_analysis view: https://dev.mysql.com/doc/refman/8.0/en/sys-statement-analysis.html
- MySQL 8.0 Reference Manual - innodb_lock_waits view: https://dev.mysql.com/doc/refman/8.0/en/sys-innodb-lock-waits.html
- MySQL 8.0 Reference Manual - io_global_by_file_by_bytes view: https://dev.mysql.com/doc/refman/8.0/en/sys-io-global-by-file-by-bytes.html
- MySQL 8.0 Reference Manual - waits_global_by_latency view: https://dev.mysql.com/doc/refman/8.0/en/sys-waits-global-by-latency.html
- MySQL 8.0 Reference Manual - statements_with_full_table_scans view: https://dev.mysql.com/doc/refman/8.0/en/sys-statements-with-full-table-scans.html
- MySQL 8.0 Reference Manual - ps_setup_show_enabled procedure: https://dev.mysql.com/doc/refman/8.0/en/sys-ps-setup-show-enabled.html
- MySQL 8.0 Reference Manual - schema_table_statistics view: https://dev.mysql.com/doc/refman/8.0/en/sys-schema-table-statistics.html
- mysql-sys GitHub repository: https://github.com/mysql/mysql-sys

## Issues Found

1. **Arithmetic on formatted sys view columns (statement_analysis)**: The `sys.statement_analysis` view returns human-readable formatted strings (e.g., "10.52 ms") for latency columns, not raw numbers. The original queries used `ROUND(avg_latency / 1000000, 2)` which would produce incorrect results on formatted strings. Fixed by switching to `sys.x$statement_analysis` which returns raw picosecond values, and corrected the conversion factors (divide by 10^9 for milliseconds, 10^12 for seconds). The original factors were off by 10^3.

2. **Wrong view for full table scan queries**: `no_index_used_count` and `no_good_index_used_count` are not columns in `sys.statement_analysis`. Fixed by changing to `sys.statements_with_full_table_scans` which has these columns.

3. **Wrong column name in innodb_lock_waits**: `blocking_lock_type` does not exist. Fixed to `blocking_lock_mode`.

4. **Non-existent procedure `sys.kill_query_or_connection()`**: This procedure does not exist in the sys schema. Replaced with standard `KILL QUERY` and `KILL` statements.

5. **Wrong column names in io_global_by_file_by_bytes**: Columns `io_read_requests`, `io_read`, `io_write_requests`, `io_write`, `io_misc_requests` do not exist in this view. Fixed to `count_read`, `total_read`, `count_write`, `total_written`, `total`. Removed invalid arithmetic ORDER BY on formatted columns.

6. **Wrong view for I/O by Table**: `sys.io_global_by_wait_by_bytes` does not have `table_schema`/`table_name` columns - it groups by event name, not by table. Fixed to `sys.schema_table_statistics` which has the correct per-table I/O columns. Added ORDER BY on integer request count columns for correct sorting.

7. **Wrong column names in waits_global_by_latency**: `event_name` should be `events`, and `count_star` should be `total`. Fixed both. Removed explicit ORDER BY on formatted columns (the view is pre-ordered by total_latency DESC).

8. **Non-existent view `sys.table_lock_waits_summary_by_table`**: This view does not exist in the sys schema. The "Wait analysis per table" sub-query was removed as there is no direct sys schema equivalent, and per-table analysis is already covered in the Table Statistics section.

9. **Arithmetic on formatted columns in user_summary and host_summary**: Same issue as statement_analysis - `statement_latency` is a formatted string in the regular views. Fixed by switching to `sys.x$user_summary` and `sys.x$host_summary` with correct conversion factor (divide by 10^12 for seconds, was dividing by 10^9 which gives milliseconds, not seconds).

10. **Wrong parameter count and description for ps_setup_show_enabled**: The procedure takes 2 boolean parameters (not 3), and it shows enabled Performance Schema instruments and threads, not InnoDB buffer pool status. Fixed both.

11. **Misleading term "deadlock investigation"**: `sys.innodb_lock_waits` shows lock contention (blocking sessions), not deadlocks specifically. MySQL detects and resolves deadlocks automatically. Fixed to "lock contention investigation".

## Review Notes
- The sys schema provides both formatted views (e.g., `sys.statement_analysis`) and raw numeric views (e.g., `sys.x$statement_analysis`). When performing arithmetic or custom ORDER BY on latency/byte columns, always use the `x$` variants. The formatted views are best used when selecting columns directly for human-readable output.
- The `sys.io_global_by_file_by_bytes` view is pre-ordered by total I/O bytes descending, and `sys.waits_global_by_latency` is pre-ordered by total latency descending. Explicit ORDER BY on formatted string columns would override the view's correct numeric ordering with incorrect string comparison.
- The post correctly notes that sys schema is available by default in MySQL 5.7.9+ and that performance_schema must be enabled.
