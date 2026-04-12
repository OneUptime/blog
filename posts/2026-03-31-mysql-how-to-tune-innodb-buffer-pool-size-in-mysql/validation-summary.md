# Validation Summary: How to Tune InnoDB Buffer Pool Size in MySQL

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- InnoDB buffer pool configuration
- performance_schema and information_schema

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Buffer Pool - https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html
- MySQL 8.0 Reference Manual: innodb_buffer_pool_size - https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_buffer_pool_size
- MySQL 8.0 Reference Manual: innodb_buffer_pool_instances - https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_buffer_pool_instances
- MySQL 8.0 Reference Manual: InnoDB Buffer Pool Resizing - https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool-resize.html
- MySQL 8.0 Reference Manual: Server Status Variables - https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html

## Issues Found
1. **Incorrect verification command after dynamic resize**: The post used `SHOW STATUS LIKE 'Innodb_buffer_pool_bytes_data'` to verify a dynamic buffer pool resize. This status variable shows the total bytes of data currently cached in the buffer pool, not the configured pool size. It does not confirm whether the resize completed or what the new size is. Changed to `SHOW VARIABLES LIKE 'innodb_buffer_pool_size'` (which shows the configured size after resize completes) and added `SHOW STATUS LIKE 'Innodb_buffer_pool_resize_status'` to check asynchronous resize progress.

## Review Notes
- The hit rate query uses `performance_schema.global_status`, which is correct for MySQL 5.7.6+ and 8.0. The `variable_value` column is VARCHAR but MySQL implicitly casts it for arithmetic, so the query works correctly.
- Dynamic buffer pool resizing was actually introduced in MySQL 5.7.5, not 8.0. The post says "MySQL 8.0" which is not wrong (it does work in 8.0), but readers on 5.7 may incorrectly assume they need to upgrade. Since MySQL 5.7 reached EOL in October 2023, this is acceptable for current guidance.
- The "one instance per GB, up to 64" rule of thumb is a reasonable simplification. The MySQL documentation states each instance should be at least 1 GB, which is the inverse framing of the same constraint.
- The config file path `/etc/mysql/mysql.conf.d/mysqld.cnf` is Ubuntu/Debian-specific. CentOS/RHEL uses `/etc/my.cnf`. This is fine for a tutorial but readers on other distributions should adjust accordingly.
