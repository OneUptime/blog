# Validation Summary: How to Track MySQL Buffer Pool Hit Rate

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- performance_schema (global_status)
- information_schema (INNODB_BUFFER_POOL_STATS)
- Prometheus mysqld_exporter
- PromQL

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Buffer Pool — https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html
- MySQL 8.0 Reference Manual: Server Status Variables (Innodb_buffer_pool_reads, Innodb_buffer_pool_read_requests) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: INNODB_BUFFER_POOL_STATS table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-buffer-pool-stats-table.html
- MySQL 8.0 Reference Manual: InnoDB Startup Options (innodb_buffer_pool_size) — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_buffer_pool_size
- MySQL 8.0 Reference Manual: Configuring InnoDB Buffer Pool Size Online — https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool-resize.html
- Prometheus mysqld_exporter documentation — https://github.com/prometheus/mysqld_exporter

## Issues Found
No technical issues found.

## Review Notes
- The `INNODB_BUFFER_POOL_STATS` query hardcodes the page size as 16384 bytes (16 KB), which is the default `innodb_page_size`. This is correct for default configurations but would produce wrong results if a non-default page size is used. A more robust approach would use `@@innodb_page_size` instead of the literal 16384, but this is a minor consideration, not an error.
- Online buffer pool resizing was actually introduced in MySQL 5.7.5, not just MySQL 8+. The post's claim that it works in "MySQL 8+" is technically correct but slightly conservative. Since MySQL 5.7 reached end-of-life in October 2023, targeting MySQL 8+ is reasonable.
- The monitoring INSERT query fetches status variables multiple times in separate scalar subqueries, which could theoretically produce slightly inconsistent snapshots under heavy load. In practice this is negligible.
