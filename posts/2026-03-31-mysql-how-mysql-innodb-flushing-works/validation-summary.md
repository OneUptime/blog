# Validation Summary: How MySQL InnoDB Flushing Works

## Status
validated

## Post Type
Technical Guide / Reference

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- InnoDB buffer pool and dirty page flushing
- InnoDB redo log and checkpointing
- MySQL Performance Schema

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Startup Options and System Variables — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual: Configuring Buffer Pool Flushing — https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool-flushing.html
- MySQL 8.0 Reference Manual: Configuring InnoDB I/O Capacity — https://dev.mysql.com/doc/refman/8.0/en/innodb-configuring-io-capacity.html
- MySQL 8.0 Reference Manual: Server Status Variables — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: InnoDB Redo Log — https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html
- MySQL Blog: New Defaults in MySQL 8.0 — https://dev.mysql.com/blog-archive/new-defaults-in-mysql-8-0/

## Issues Found
1. **`innodb_flush_neighbors` default value incorrect**: The post stated `innodb_flush_neighbors = 1` was the "default for HDD." In MySQL 8.0, the default was changed to **0** (disabled, optimized for SSD). The value 1 was the default in MySQL 5.7. Fixed the text to clarify the version history: the default is 0 in MySQL 8.0, while 1 was the MySQL 5.7 default and remains useful for HDD setups.

## Review Notes
- The post references `innodb_log_file_size` in the adaptive flushing section. This variable was deprecated in MySQL 8.0.30 in favor of `innodb_redo_log_capacity` and removed in MySQL 8.4. The reference is still valid for MySQL 8.0.x but will become outdated for newer versions.
- All other default values (`innodb_max_dirty_pages_pct=90`, `innodb_max_dirty_pages_pct_lwm=10`, `innodb_adaptive_flushing=ON`, `innodb_adaptive_flushing_lwm=10`, `innodb_io_capacity=200`, `innodb_io_capacity_max=2000`) are correct for MySQL 8.0.
- The SQL query using `performance_schema.global_status` is the correct approach for MySQL 8.0 (as `information_schema.global_status` requires `show_compatibility_56=ON` which is removed in 8.0).
- The `SHOW ENGINE INNODB STATUS` field names and descriptions are accurate.
- Note: `innodb_io_capacity` default was increased to 10000 in MySQL 8.4, so the recommended tuning values may need revisiting for newer MySQL versions.
