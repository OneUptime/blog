# Validation Summary: How to Tune tmp_table_size for MySQL

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- MySQL (tmp_table_size, max_heap_table_size system variables)
- MySQL Performance Schema (global_status, events_statements_summary_by_digest)
- MySQL EXPLAIN output interpretation

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables (tmp_table_size, max_heap_table_size) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: Internal Temporary Table Use in MySQL — https://dev.mysql.com/doc/refman/8.0/en/internal-temporary-tables.html
- MySQL 8.0 Reference Manual: Server Status Variables (Created_tmp_disk_tables, Created_tmp_tables) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: Performance Schema Statement Summary Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html

## Issues Found

1. **Misleading SQL comment (line 66)**: The comment said `-- Check dynamically` but the commands were `SET GLOBAL` statements that change the value, not check it. Changed to `-- Set dynamically`.

2. **Incorrect EXPLAIN output interpretation (line 109)**: The post claimed that `Using temporary; Using filesort` in the EXPLAIN `Extra` column indicates "disk-bound queries." This is incorrect — `Using temporary` in EXPLAIN output indicates that a temporary table is needed, but does NOT distinguish between in-memory and on-disk temporary tables. Corrected to explain that `Using temporary` shows temp table usage, and that the `Created_tmp_disk_tables` status variable or Performance Schema should be used to determine whether temp tables are going to disk.

## Review Notes
- In MySQL 8.0+, the default `internal_tmp_mem_storage_engine` is `TempTable`, not `MEMORY`. When the TempTable engine is used, in-memory temporary table size is controlled by `temptable_max_ram` (default 1 GB) and `temptable_max_mmap` (default 1 GB), NOT by `tmp_table_size` and `max_heap_table_size`. The article's tuning advice for `tmp_table_size`/`max_heap_table_size` applies when the MEMORY engine is used (MySQL 5.7 or when `internal_tmp_mem_storage_engine = MEMORY` in 8.0). A future update could mention this distinction for MySQL 8.0+ users.
- The TempTable storage engine in MySQL 8.0+ can handle BLOB and TEXT columns in memory, so the claim that these "always go to disk" is only accurate for the MEMORY engine. The post does not specify a MySQL version, so this is noted as a caveat rather than an error.
- All Performance Schema table and column names were verified as correct.
- The memory impact calculation formula is correct, though the post rightly notes it represents a theoretical maximum.
