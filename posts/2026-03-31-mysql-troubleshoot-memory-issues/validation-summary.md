# Validation Summary: How to Troubleshoot MySQL Memory Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL (5.7+ and 8.0+)
- InnoDB storage engine
- Performance Schema
- sys schema
- Linux process monitoring (`free`, `ps`, `/proc`)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Buffer Pool: https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html
- MySQL 8.0 Reference Manual — Performance Schema global_status table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html
- MySQL 8.0 Reference Manual — information_schema.GLOBAL_STATUS deprecation: https://dev.mysql.com/doc/refman/8.0/en/information-schema-status-table.html
- MySQL 8.0 Reference Manual — sys.memory_global_by_current_bytes view: https://dev.mysql.com/doc/refman/8.0/en/sys-memory-global-by-current-bytes.html
- MySQL 8.0 Reference Manual — Server System Variables (sort_buffer_size, join_buffer_size, read_buffer_size): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — SET GLOBAL innodb_buffer_pool_size (online resize since 5.7.5): https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool-resize.html
- MySQL 8.0 Reference Manual — Performance Schema setup_instruments table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-instruments-table.html

## Issues Found
1. **Non-functional "Key metrics" query (lines 40-49):** The original query used `PIVOT` (a SQL Server keyword that does not exist in MySQL) and referenced status variables (`Innodb_buffer_pool_bytes_data`, `Innodb_buffer_pool_bytes_dirty`, etc.) as if they were columns, when they are actually stored as rows in the status tables. It also used `information_schema.GLOBAL_STATUS`, which was deprecated in MySQL 5.7.6 and removed in MySQL 8.0. **Fix:** Replaced the entire query with a working version that uses scalar subqueries against `performance_schema.global_status` to produce the same single-row result the author intended.

## Review Notes
- The `information_schema.PROCESSLIST` table used in the "Detecting Memory Leaks" section is deprecated as of MySQL 8.0.22 in favor of `performance_schema.processlist`, but it still functions and is widely used. This is acceptable for a general troubleshooting guide.
- The config file path `/etc/mysql/mysql.conf.d/mysqld.cnf` is Ubuntu/Debian-specific. Other distributions may use `/etc/my.cnf` or `/etc/mysql/my.cnf`. The post doesn't claim otherwise, so this is fine as an example.
- The 50-75% RAM guideline for the buffer pool is a widely accepted rule of thumb for dedicated MySQL servers and is correctly stated.
- The `SET GLOBAL innodb_buffer_pool_size` dynamic resize capability starting in MySQL 5.7.5 is accurately documented.
