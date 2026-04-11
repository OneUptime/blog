# Validation Summary: MySQL Performance Schema Cheat Sheet

## Status
validated

## Post Type
Cheat Sheet / Reference

## Technologies Covered
- MySQL Performance Schema (MySQL 8.0+)
- SQL queries for performance diagnostics

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema Table Reference — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-descriptions.html
- MySQL 8.0 Reference Manual: Performance Schema Statement Digest Summary Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html
- MySQL 8.0 Reference Manual: data_lock_waits Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual: data_locks Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html
- MySQL 8.0 Reference Manual: Memory Summary Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-memory-summary-tables.html
- MySQL 8.0 Reference Manual: hosts Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-hosts-table.html
- MySQL 8.0 Reference Manual: status_by_host Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-summary-tables.html
- MySQL 8.0 Reference Manual: Performance Schema Timers — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html

## Issues Found

1. **Currently Running Queries — incorrect timer unit alias**: The query `timer_wait / 1e9 AS elapsed_sec` divided picoseconds by 1e9, which yields milliseconds, not seconds. Changed divisor to `1e12` so the alias `elapsed_sec` is accurate.

2. **Lock Contention — invalid JOIN clause**: The query used `JOIN ... USING (engine_lock_id)`, but `data_lock_waits` does not have a column named `engine_lock_id` — it has `requesting_engine_lock_id` and `blocking_engine_lock_id`. Replaced with an explicit `ON w.blocking_engine_lock_id = l.engine_lock_id` join with proper table aliases, and qualified the SELECT columns to avoid ambiguity.

3. **Memory Usage — nonexistent column names**: The query referenced `current_alloc` and `high_alloc`, which do not exist in `performance_schema.memory_summary_global_by_event_name`. These names come from the `sys` schema views, not the raw Performance Schema table. Replaced with the correct columns: `CURRENT_NUMBER_OF_BYTES_USED` and `HIGH_NUMBER_OF_BYTES_USED`.

4. **Connection Statistics per Host — wrong table and columns**: The query selected `sum_connections` and `sum_errors` from `performance_schema.status_by_host`, but that table is a key-value store (HOST, VARIABLE_NAME, VARIABLE_VALUE) and does not have those columns. Replaced with `performance_schema.hosts` using its actual columns `current_connections` and `total_connections`.

## Review Notes
- All Performance Schema timer values are in picoseconds. The remaining queries in the post correctly divide by 1e9 to get milliseconds with appropriate `_ms` aliases.
- The `data_lock_waits` and `data_locks` tables are MySQL 8.0+ only (they replaced the older `INNODB_LOCK_WAITS` and `INNODB_LOCKS` tables from the `information_schema`). The post does not mention a MySQL version requirement, which could confuse MySQL 5.7 users.
- The `metadata_locks` table requires the `wait/lock/metadata/sql/mdl` instrument to be enabled, which is off by default in some MySQL versions. The post does not mention this prerequisite.
- The summary correctly recommends pairing Performance Schema with the sys schema for pre-built diagnostic views.
