# Validation Summary: How to Use SHOW STATUS in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (SHOW STATUS statement)
- MySQL Performance Schema
- InnoDB buffer pool monitoring
- Prometheus mysqld_exporter

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW STATUS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-status.html)
- MySQL 8.0 Reference Manual: Server Status Variables (https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html)
- MySQL 8.0 Reference Manual: Performance Schema Status Variable Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html)
- MySQL 8.0 Reference Manual: Migrating from information_schema to performance_schema (https://dev.mysql.com/doc/refman/8.0/en/migrating-to-performance-schema.html)
- MySQL 8.0 Reference Manual: FLUSH STATUS (https://dev.mysql.com/doc/refman/8.0/en/flush.html#flush-status)

## Issues Found
1. **`information_schema.global_status` replaced with `performance_schema.global_status`** (two occurrences): The InnoDB buffer pool hit rate query and the queries-per-second query both referenced `information_schema.global_status`. This view was removed in MySQL 8.0 (the current major version; MySQL 5.7 reached EOL in October 2023). Updated both queries to use `performance_schema.global_status`, which is the correct table for MySQL 8.0+.

## Review Notes
- The `SHOW GLOBAL STATUS LIKE 'Slave_%'` pattern in the Replication Metrics section still works but is considered legacy terminology. MySQL 8.0.22+ introduced `Replica_` prefixed aliases (e.g., `Replica_open_temp_tables`). The old `Slave_` names continue to work as aliases, so this is not an error but may warrant updating in a future revision.
- All status variable names referenced in the post (`Threads_connected`, `Threads_running`, `Max_used_connections`, `Connection_errors_max_connections`, `Aborted_connects`, `Aborted_clients`, `Questions`, `Com_select`, `Com_insert`, `Com_update`, `Com_delete`, `Slow_queries`, `Sort_merge_passes`, `Created_tmp_disk_tables`, `Innodb_buffer_pool_reads`, `Innodb_buffer_pool_read_requests`, `Open_tables`, `Opened_tables`, `Table_open_cache_hits`, `Table_open_cache_misses`, `Open_files`, `Opened_files`) are valid MySQL 8.0 status variables.
- The SHOW STATUS syntax, LIKE/WHERE filtering, and FLUSH STATUS behavior are all accurately described.
- The Prometheus mysqld_exporter metric names and default port (9104) are correct.
