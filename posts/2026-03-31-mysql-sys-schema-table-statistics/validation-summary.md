# Validation Summary: How to Use MySQL sys.schema_table_statistics View

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 5.7+ / 8.0
- MySQL sys schema
- MySQL performance_schema
- SQL

## Sources Consulted
- MySQL 8.0 Reference Manual: sys Schema (https://dev.mysql.com/doc/refman/8.0/en/sys-schema.html)
- MySQL 8.0 Reference Manual: sys.schema_table_statistics view (https://dev.mysql.com/doc/refman/8.0/en/sys-schema-table-statistics.html)
- MySQL 8.0 Reference Manual: sys.schema_table_statistics_with_buffer view (https://dev.mysql.com/doc/refman/8.0/en/sys-schema-table-statistics-with-buffer.html)
- MySQL 8.0 Reference Manual: sys.host_summary view (https://dev.mysql.com/doc/refman/8.0/en/sys-host-summary.html)
- MySQL 8.0 Reference Manual: sys.io_global_by_file_by_latency view (https://dev.mysql.com/doc/refman/8.0/en/sys-io-global-by-file-by-latency.html)
- MySQL 8.0 Reference Manual: sys.io_global_by_file_by_bytes view (https://dev.mysql.com/doc/refman/8.0/en/sys-io-global-by-file-by-bytes.html)
- MySQL 8.0 Reference Manual: sys.memory_by_host_by_current_bytes view (https://dev.mysql.com/doc/refman/8.0/en/sys-memory-by-host-by-current-bytes.html)
- MySQL 8.0 Reference Manual: sys.innodb_lock_waits view (https://dev.mysql.com/doc/refman/8.0/en/sys-innodb-lock-waits.html)
- MySQL 8.0 Reference Manual: sys.ps_truncate_all_tables procedure (https://dev.mysql.com/doc/refman/8.0/en/sys-ps-truncate-all-tables.html)

## Issues Found

1. **Incorrect column name in `host_summary` query**: The column `connections` does not exist in `sys.host_summary`. The correct column name is `total_connections`. Fixed the query accordingly.

2. **Wrong view and columns for file I/O latency query**: The query used `sys.io_global_by_file_by_bytes` with columns `read_latency`, `write_latency`, and `total` — none of which are latency columns in that view. The `io_global_by_file_by_bytes` view contains byte-related columns (`total_read`, `total_write`, `total`). Since the description says "slowest file I/O" (latency-focused), changed the view to `sys.io_global_by_file_by_latency` which has `total_latency`, `read_latency`, and `write_latency` columns. Also changed `total` to `total_latency` and the ORDER BY clause to match.

3. **`memory_by_host_by_current_bytes` called as a procedure**: `sys.memory_by_host_by_current_bytes` is a view, not a stored procedure. Changed `CALL sys.memory_by_host_by_current_bytes()` to `SELECT * FROM sys.memory_by_host_by_current_bytes`.

4. **`innodb_lock_waits` called as a procedure**: `sys.innodb_lock_waits` is a view, not a stored procedure. Changed `CALL sys.innodb_lock_waits()` to `SELECT * FROM sys.innodb_lock_waits`.

5. **Section title "sys Schema Procedures" was misleading**: All three items in the section (`memory_by_host_by_current_bytes`, `innodb_lock_waits`, `statements_with_temp_tables`) are views, not procedures. Renamed the section to "More Useful sys Views".

## Review Notes
- The post correctly identifies `sys.ps_truncate_all_tables(FALSE)` as a procedure (it is indeed a stored procedure, unlike the views that were incorrectly called with CALL).
- All column names for `schema_table_statistics`, `schema_table_statistics_with_buffer`, `statement_analysis`, `schema_unused_indexes`, `schema_redundant_indexes`, and `session` views were verified as correct.
- The post's claim that sys schema was introduced in MySQL 5.7 is accurate. It was bundled with MySQL starting from version 5.7.7.
- The write-load calculation (`rows_inserted + rows_updated + rows_deleted AS total_writes`) is a reasonable approach, though it sums row counts rather than latencies — this is fine for identifying write-heavy tables by volume.
