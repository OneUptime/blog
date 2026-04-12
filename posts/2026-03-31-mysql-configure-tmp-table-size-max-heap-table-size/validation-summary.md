# Validation Summary: How to Configure tmp_table_size and max_heap_table_size in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL (server variables, temporary tables, performance tuning)
- Performance Schema
- MySQL configuration files (my.cnf)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables — tmp_table_size (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_tmp_table_size)
- MySQL 8.0 Reference Manual: Server System Variables — max_heap_table_size (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_heap_table_size)
- MySQL 8.0 Reference Manual: Internal Temporary Table Use in MySQL (https://dev.mysql.com/doc/refman/8.0/en/internal-temporary-tables.html)
- MySQL 8.0 Reference Manual: Server Status Variables — Created_tmp_disk_tables, Created_tmp_tables (https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html)
- MySQL 8.0 Reference Manual: Performance Schema Status Variable Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html)
- MySQL 8.0 Reference Manual: The events_statements_summary_by_digest Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html)

## Issues Found
1. **`information_schema.GLOBAL_STATUS` replaced with `performance_schema.global_status`**: The disk percentage calculation query used `information_schema.GLOBAL_STATUS`, which was deprecated in MySQL 5.7.6 and removed in MySQL 8.0. Updated both subqueries to use `performance_schema.global_status`, which is the correct table for MySQL 5.7.6+ and 8.0+.

## Review Notes
- All byte values are correct: 16777216 = 16 MB, 67108864 = 64 MB, 268435456 = 256 MB.
- The explanation that the effective limit is the smaller of `tmp_table_size` and `max_heap_table_size` is accurate per MySQL documentation.
- The per-session memory calculation (100 connections x 64 MB = 6.4 GB) is correct and is important guidance.
- The RAM allocation formula ((available_ram * 0.10) / max_connections) is reasonable practical advice.
- The Performance Schema query against `events_statements_summary_by_digest` uses valid column names (`DIGEST_TEXT`, `SUM_CREATED_TMP_DISK_TABLES`, `SUM_CREATED_TMP_TABLES`, `SUM_ROWS_EXAMINED`).
- The `my.cnf` configuration syntax with suffix notation (64M) is correct.
- Note: In MySQL 8.0.16+, the TempTable storage engine (default for internal temporary tables) introduced `temptable_max_ram` and `temptable_max_mmap` as additional controls. The post's guidance remains valid but users on MySQL 8.0.16+ may also want to be aware of these newer variables.
