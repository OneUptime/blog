# Validation Summary: How to Configure key_buffer_size in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- MyISAM storage engine
- MySQL key_buffer_size system variable
- MySQL performance_schema / information_schema
- MySQL named key caches

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables (`key_buffer_size`) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_key_buffer_size
- MySQL 8.0 Reference Manual: Server Status Variables (Key_reads, Key_read_requests, etc.) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: The CACHE INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/cache-index.html
- MySQL 8.0 Reference Manual: Performance Schema global_status Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html
- MySQL 8.0 Reference Manual: Migrating from INFORMATION_SCHEMA to Performance Schema — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-migration.html
- MySQL 8.0 Reference Manual: Data Dictionary — https://dev.mysql.com/doc/refman/8.0/en/data-dictionary.html

## Issues Found

1. **`information_schema.GLOBAL_STATUS` replaced by `performance_schema.global_status`**: The key cache hit rate and buffer utilization queries used `information_schema.GLOBAL_STATUS`, which was deprecated in MySQL 5.7.6 and removed in MySQL 8.0. Updated both queries to use `performance_schema.global_status` instead.

2. **Outdated claim about MySQL system tables using MyISAM**: The "If You Use Only InnoDB" section stated "MySQL system tables use MyISAM internally." This is incorrect for MySQL 8.0+, where the data dictionary was redesigned and system tables now use InnoDB. Updated the explanation to note that a small `key_buffer_size` is still recommended because MySQL may create temporary MyISAM tables during query processing.

3. **Misleading hit rate formula in summary**: The summary stated "Monitor the cache hit rate (`Key_reads` / `Key_read_requests`)" but `Key_reads / Key_read_requests` is actually the cache *miss* ratio. Fixed to "1 - `Key_reads` / `Key_read_requests`" to match the correct formula used earlier in the post.

## Review Notes
- The post does not specify a MySQL version. The fixes target MySQL 8.0+ compatibility since that is the current mainstream version. The `SHOW GLOBAL STATUS` command used earlier in the post works across all versions and remains correct.
- The default `key_buffer_size` of 8 MB (8388608 bytes) is confirmed correct for both MySQL 5.7 and 8.0.
- The named key caches syntax (`SET GLOBAL hot_cache.key_buffer_size`, `CACHE INDEX ... IN ...`, `LOAD INDEX INTO CACHE ...`) is correct.
- The query to estimate MyISAM index size via `information_schema.TABLES` is correct (this table is still available in MySQL 8.0, unlike `GLOBAL_STATUS`).
