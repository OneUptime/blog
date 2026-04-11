# Validation Summary: How to Tune MySQL for Mixed Read-Write Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0.30+ (InnoDB storage engine)
- Performance Schema
- ProxySQL (query routing)
- information_schema

## Sources Consulted
- MySQL 8.0 Reference Manual — Performance Schema Status Variable Tables: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html
- MySQL 8.0 Reference Manual — Server Status Variables (Com_xxx counters): https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual — InnoDB Redo Log (`innodb_redo_log_capacity` introduced in 8.0.30): https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html
- MySQL 8.0 Reference Manual — table_io_waits_summary_by_index_usage table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-wait-summary-tables.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA STATISTICS Table: https://dev.mysql.com/doc/refman/8.4/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual — Configuring Buffer Pool Flushing: https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool-flushing.html
- ProxySQL Configuration File Documentation: https://proxysql.com/documentation/configuration-file/
- ProxySQL Read/Write Split Howto: https://www.proxysql.com/documentation/proxysql-read-write-split-howto/

## Issues Found
1. **Incorrect column names in unused-index query**: The `performance_schema.table_io_waits_summary_by_index_usage` table does not have `COUNT_READ` or `COUNT_WRITE` columns. The correct column for read operations is `COUNT_FETCH`, and write operations must be computed as `COUNT_INSERT + COUNT_UPDATE + COUNT_DELETE`. Updated the SELECT list, WHERE clause, and ORDER BY clause accordingly.

## Review Notes
- The `innodb_redo_log_capacity` parameter was introduced in MySQL 8.0.30, replacing the older `innodb_log_file_size` and `innodb_log_files_in_group`. The post does not specify a MySQL version, so readers on older versions would need to use the legacy parameters instead.
- Several configuration values (`innodb_read_io_threads = 4`, `innodb_write_io_threads = 4`, `innodb_adaptive_flushing = ON`, `innodb_adaptive_flushing_lwm = 10`) are set to their defaults. This is fine for documentation purposes but readers should be aware these are the out-of-box values.
- The ProxySQL configuration is shown in proxysql.cnf (libconfig) format. Many users configure ProxySQL via its SQL admin interface instead; the blog could optionally mention this alternative.
