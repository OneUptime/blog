# Validation Summary: How to Monitor InnoDB Buffer Pool Usage in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- InnoDB Buffer Pool
- performance_schema.global_status
- information_schema.INNODB_BUFFER_POOL_STATS
- information_schema.INNODB_BUFFER_PAGE
- SHOW ENGINE INNODB STATUS

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Buffer Pool: https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html
- MySQL 8.0 Reference Manual — Server Status Variables (Innodb_buffer_pool_*): https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual — INNODB_BUFFER_POOL_STATS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-buffer-pool-stats-table.html
- MySQL 8.0 Reference Manual — INNODB_BUFFER_PAGE Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-buffer-page-table.html
- MySQL 8.0 Reference Manual — Saving and Restoring the Buffer Pool State: https://dev.mysql.com/doc/refman/8.0/en/innodb-preload-buffer-pool.html
- MySQL 8.0 Reference Manual — Server System Variables (innodb_buffer_pool_size): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html

## Issues Found

1. **`Innodb_buffer_pool_size` listed as a status variable (line 30):** `innodb_buffer_pool_size` is a system variable (configuration parameter), not a server status variable. It does not appear in `performance_schema.global_status` or `SHOW STATUS`. It should be queried via `performance_schema.global_variables` or `SHOW VARIABLES`. Removed it from the `IN (...)` list in the key status variables query.

2. **Hot Tables query used `SUM(DATA_SIZE)` aliased as `pages_in_pool` (line 108):** `DATA_SIZE` is the byte size of data within each buffer page row in `INNODB_BUFFER_PAGE`. Summing it gives total bytes, not a page count. Since the comment and alias both indicate counting pages, changed to `COUNT(*)` which correctly counts the number of buffer pool pages occupied by each table.

## Review Notes
- The `INNODB_BUFFER_POOL_STATS` and `INNODB_BUFFER_PAGE` tables remain available in MySQL 8.0+ under `information_schema`.
- The performance caveat about querying `INNODB_BUFFER_PAGE` on large buffer pools is accurate and important — it acquires mutexes on each buffer pool chunk.
- The `HIT_RATE` column in `INNODB_BUFFER_POOL_STATS` is expressed per 1000 (e.g., 999 = 99.9%), so the conversion `HIT_RATE / 1000.0 * 100` is correct.
- The buffer pool dump/restore commands and status variable names are all accurate.
- The cache hit rate formula is mathematically correct: `(1 - physical_reads / logical_reads) * 100`.
