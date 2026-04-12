# Validation Summary: How to Fix High Memory Usage in MySQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- performance_schema
- Linux process monitoring (ps, /proc, dmesg)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Buffer Pool — https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html
- MySQL 8.0 Reference Manual: INNODB_BUFFER_POOL_STATS table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-buffer-pool-stats-table.html
- MySQL 8.0 Reference Manual: memory_summary_global_by_event_name table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-memory-summary-tables.html
- MySQL 8.0 Reference Manual: Server System Variables (per-thread buffers) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: Performance Schema System Variables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-system-variables.html

## Issues Found
- **Incorrect pool_size calculation in INNODB_BUFFER_POOL_STATS query**: The `POOL_SIZE` column in `information_schema.INNODB_BUFFER_POOL_STATS` returns the buffer pool size in **pages**, not bytes. The original query used `FORMAT(pool_size/1024/1024, 0)` which would produce an incorrect (far too small) result. Fixed to `FORMAT(pool_size*16/1024, 0)` to match the formula used for the `database_pages` and `free_buffers` columns in the same query (pages * 16KB per page / 1024 = MB).

## Review Notes
- The `pool_size*16/1024` formula assumes the default `innodb_page_size` of 16KB. If a non-default page size is configured, the multiplier would need adjustment. This is a reasonable assumption for a general guide since the vast majority of MySQL installations use the default page size.
- In MySQL 8.0.14+, `innodb_buffer_pool_instances` is ignored when `innodb_buffer_pool_size` is less than 1GB. The post's example uses 8GB so this is not an issue, but worth noting for readers who may adapt the config.
- All bash commands, SQL queries (after fix), configuration directives, and variable names are correct and current for MySQL 8.0.
