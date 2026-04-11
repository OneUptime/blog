# Validation Summary: How to Scale MySQL with Vertical Scaling

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL 8.0 (and pre-8.0.30 variants)
- InnoDB storage engine
- mysqlslap benchmarking tool
- NVMe SSD storage
- performance_schema

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Buffer Pool Configuration (https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html)
- MySQL 8.0 Reference Manual: InnoDB Thread Concurrency (https://dev.mysql.com/doc/refman/8.0/en/innodb-performance-thread_concurrency.html)
- MySQL 8.0 Reference Manual: InnoDB I/O Configuration (https://dev.mysql.com/doc/refman/8.0/en/innodb-configuring-io-capacity.html)
- MySQL 8.0 Reference Manual: InnoDB Redo Log (https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html)
- MySQL 8.0 Reference Manual: Server System Variables (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html)
- MySQL 8.0 Reference Manual: mysqlslap (https://dev.mysql.com/doc/refman/8.0/en/mysqlslap.html)
- MySQL 8.0 Reference Manual: performance_schema.global_status (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html)

## Issues Found
No technical issues found.

## Review Notes
- The `innodb_flush_method = O_DIRECT` setting is Linux-specific and not available on Windows or macOS. The post does not mention this OS constraint, which is acceptable for a server-focused guide but worth noting.
- `innodb_buffer_pool_instances` was deprecated in MySQL 8.4 (the next LTS release). For readers on MySQL 8.4+, this setting may generate deprecation warnings.
- `innodb_log_files_in_group` and `innodb_log_file_size` were deprecated in MySQL 8.0.30 and removed in MySQL 8.0.34. The post correctly identifies these as for "older versions."
- The older redo log config snippet omits the `[mysqld]` section header, but context makes it clear these belong under `[mysqld]` from the preceding snippet.
