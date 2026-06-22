# Validation Summary: How to Fix 'Out of Memory' Errors in MySQL

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- MySQL
- InnoDB
- Performance Schema
- sys schema
- MySQL server configuration
- Linux system logs and OOM killer configuration
- systemd

## Sources Consulted
- MySQL 8.4 Reference Manual: Monitoring MySQL Memory Usage - https://dev.mysql.com/doc/refman/8.4/en/monitor-mysql-memory-use.html
- MySQL 9.7 Reference Manual: Buffer Pool - https://dev.mysql.com/doc/refman/9.7/en/innodb-buffer-pool.html
- MySQL 9.7 Reference Manual: Internal Temporary Table Use in MySQL - https://dev.mysql.com/doc/refman/9.7/en/internal-temporary-tables.html
- MySQL 8.4 Reference Manual: What Is New in MySQL 8.4 since MySQL 8.0 - https://dev.mysql.com/doc/refman/8.4/en/mysql-nutshell.html
- MySQL 8.4 Reference Manual: Performance Schema Statement Summary Tables - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-summary-tables.html
- MySQL Reference Manual: Query Cache Status and Maintenance - https://dev.mysql.com/doc/refman/5.7/en/query-cache-status-and-maintenance.html
- Local command help for systemctl and journalctl.

## Issues Found
- The memory aggregation examples used `sys.memory_global_by_current_bytes`, where memory values are formatted strings. Changed aggregate calculations to use `sys.x$memory_global_by_current_bytes` and format the final byte totals with `FORMAT_BYTES()`.
- The Performance Schema digest query used non-existent columns: `sql_text`, `created_tmp_tables`, and `created_tmp_disk_tables`. Replaced them with `digest_text`, `sum_created_tmp_tables`, and `sum_created_tmp_disk_tables`.
- The monitoring event inserted into a `memory_stats` table that was never defined. Added a minimal `CREATE TABLE IF NOT EXISTS memory_stats` statement before the event.
- The post labeled Query Cache only as deprecated. Updated the diagram to state that Query Cache was removed in MySQL 8.0.
- The temporary table configuration omitted current TempTable-specific memory behavior. Added `temptable_max_ram` and clarified which settings apply to TempTable versus MEMORY-engine internal temporary tables.
- The stored procedure section described user-written stored procedures as leaking memory. Reworded it to focus on long-running procedures or queries holding memory longer than expected.
- The buffer pool instance recommendation used a fixed rule of one instance per GB. Updated the comment to note that MySQL 8.4+ autosizes buffer pool instances by default.

## Review Notes
The remaining commands and configuration examples are broadly correct, but several are operationally environment-specific: MySQL service names and log paths vary by distribution, OOM score changes require root privileges, and Performance Schema memory data is most useful when memory instruments are enabled at startup.
