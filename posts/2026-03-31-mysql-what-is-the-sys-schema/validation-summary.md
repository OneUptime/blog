# Validation Summary: What Is the sys Schema in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL 5.7+
- MySQL sys schema (views, functions, procedures)
- MySQL Performance Schema
- INFORMATION_SCHEMA

## Sources Consulted
- MySQL 8.0 Reference Manual: sys Schema — https://dev.mysql.com/doc/refman/8.0/en/sys-schema.html
- MySQL 8.0 sys.statement_analysis — https://dev.mysql.com/doc/refman/8.0/en/sys-statement-analysis.html
- MySQL 8.0 sys.schema_unused_indexes — https://dev.mysql.com/doc/refman/8.0/en/sys-schema-unused-indexes.html
- MySQL 8.0 sys.schema_tables_with_full_table_scans — https://dev.mysql.com/doc/refman/8.0/en/sys-schema-tables-with-full-table-scans.html
- MySQL 8.0 sys.user_summary — https://dev.mysql.com/doc/refman/8.0/en/sys-user-summary.html
- MySQL 8.0 sys.host_summary — https://dev.mysql.com/doc/refman/8.0/en/sys-host-summary.html
- MySQL 8.0 sys.memory_by_user_by_current_bytes — https://dev.mysql.com/doc/refman/8.0/en/sys-memory-by-user-by-current-bytes.html
- MySQL 8.0 sys.io_global_by_file_by_bytes — https://dev.mysql.com/doc/refman/8.0/en/sys-io-global-by-file-by-bytes.html
- MySQL 8.0 sys.format_bytes — https://dev.mysql.com/doc/refman/8.0/en/sys-format-bytes.html
- MySQL 8.0 sys.format_time — https://dev.mysql.com/doc/refman/8.0/en/sys-format-time.html
- MySQL 8.0 sys.format_statement — https://dev.mysql.com/doc/refman/8.0/en/sys-format-statement.html
- MySQL 8.0 sys.diagnostics — https://dev.mysql.com/doc/refman/8.0/en/sys-diagnostics.html
- MySQL 8.0 sys.ps_thread_trx_info — https://dev.mysql.com/doc/refman/8.0/en/sys-ps-thread-trx-info.html

## Issues Found

1. **Incorrect `format_time` input value**: The post used `sys.format_time(1250000000000)` claiming it returns `'1.25 ms'`. However, 1,250,000,000,000 picoseconds = 1.25 seconds, not 1.25 milliseconds. Fixed by changing the input to `1250000000` (1.25 x 10^9 ps = 1.25 ms).

2. **Non-existent columns in `sys.user_summary`**: The post selected `rows_sent` and `rows_examined` from `sys.user_summary`, but these columns do not exist in that view. Replaced with `statements` and `table_scans`, which are actual columns of the view.

3. **Non-existent column in `sys.io_global_by_file_by_bytes`**: The post selected `total_latency` from `sys.io_global_by_file_by_bytes`, but this column does not exist in the bytes-oriented view (latency data is in `sys.io_global_by_file_by_latency` instead). Replaced with `write_pct`, which is an actual column of this view.

4. **`ps_thread_trx_info` is a function, not a procedure**: The post used `CALL sys.ps_thread_trx_info(42)`, but `ps_thread_trx_info` is a function that returns JSON, not a stored procedure. Fixed to `SELECT sys.ps_thread_trx_info(42)\G`.

## Review Notes
- The `sys.diagnostics` procedure signature is correct but worth noting it can take a long time to run on busy servers and produces very large output.
- The overview correctly notes sys schema availability starting in MySQL 5.7 (specifically 5.7.7).
- All other view names, column names, and function signatures verified as accurate.
