# Validation Summary: How to Monitor InnoDB Metrics in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- information_schema.INNODB_METRICS table
- InnoDB monitor variables (innodb_monitor_enable, innodb_monitor_disable, innodb_monitor_reset, innodb_monitor_reset_all)
- Prometheus mysqld_exporter

## Sources Consulted
- MySQL 8.0 Reference Manual — INNODB_METRICS Table: https://dev.mysql.com/doc/refman/8.0/en/innodb-metrics-table.html
- MySQL 8.0 Reference Manual — InnoDB Startup Options and System Variables (innodb_monitor_enable): https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_monitor_enable
- Prometheus mysqld_exporter README (collector flags): https://github.com/prometheus/mysqld_exporter

## Issues Found
1. **Incorrect description of `buffer_pool_pages_dirty`**: The original text described this metric as "Pages with uncommitted modifications." This is misleading — dirty pages are pages that have been modified in the buffer pool but not yet flushed (written) to the data files on disk. A dirty page can contain committed data that simply hasn't been flushed yet; "dirty" refers to divergence from the on-disk copy, not to transaction commit state. Changed to: "Pages modified in the buffer pool but not yet flushed to disk."

## Review Notes
- The `%` wildcard usage with `innodb_monitor_enable` (e.g., `'buffer_%'`) is correct per MySQL documentation and enables all counters matching the pattern.
- The `my.cnf` example specifying `innodb_monitor_enable` multiple times is valid — MySQL documentation confirms this variable can be specified multiple times in an option file, with each instance taking effect.
- The mysqld_exporter flags (`--collect.info_schema.innodb_metrics`, `--collect.global_status`, `--collect.engine_innodb_status`) are all valid and current. Note that `--collect.global_status` is enabled by default while the other two are not.
- The `log_write_requests` vs `log_writes` comparison and the recommendation to increase `innodb_log_buffer_size` when they are nearly equal is technically sound.
- The `trx_rseg_history_len` explanation (undo history list length indicating long-running transactions) is accurate.
- The counter name `buffer_LRU_get_free_waits` exists in MySQL 5.7 but may not be present in all MySQL 8.0 versions. Since the post does not target a specific MySQL version, this is acceptable but worth noting for readers on newer versions.
