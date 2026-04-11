# Validation Summary: How to Monitor InnoDB Status in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0 / 8.0.30+
- InnoDB storage engine
- information_schema
- performance_schema
- Prometheus mysqld_exporter
- Grafana

## Sources Consulted
- MySQL 8.0 Server Status Variables Reference: https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 data_lock_waits Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Wait Event Summary Tables: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-wait-summary-tables.html
- MySQL 8.0 Performance Schema Timing: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html
- MySQL 8.0 innodb_redo_log_files Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-innodb-redo-log-files-table.html
- Prometheus mysqld_exporter documentation: https://github.com/prometheus/mysqld_exporter

## Issues Found

1. **`Innodb_deadlocks` is not a valid SHOW GLOBAL STATUS variable.** The metrics table listed `Innodb_deadlocks` as a status variable, but this does not exist in MySQL 8.0. Deadlock counts are available via `information_schema.INNODB_METRICS` (`lock_deadlocks`), not `SHOW GLOBAL STATUS`. Replaced with `Innodb_row_lock_time` (total row lock wait time in ms), which is a real and relevant InnoDB status variable.

2. **`information_schema.INNODB_LOCK_WAITS` was removed in MySQL 8.0.** The lock waits query referenced this table, which was removed in MySQL 8.0.1. Updated to use `performance_schema.data_lock_waits` with the correct column names (`BLOCKING_ENGINE_TRANSACTION_ID` and `REQUESTING_ENGINE_TRANSACTION_ID` instead of the old `blocking_trx_id` / `requesting_trx_id`). Also updated the summary section reference.

3. **Incorrect column name `SUM_WAIT_TIME` in performance_schema query.** The correct column in `events_waits_summary_global_by_event_name` is `SUM_TIMER_WAIT`, not `SUM_WAIT_TIME`. Also fixed the divisor from `/1e9` to `/1e12` since performance_schema timer values are in picoseconds, not nanoseconds.

## Review Notes
- The redo log status variables (`Innodb_redo_log%`) and `performance_schema.innodb_redo_log_files` are MySQL 8.0.30+ features. The post correctly notes the version requirement for the table but not for the `SHOW GLOBAL STATUS` variables, which also require 8.0.30+.
- The buffer pool hit rate query is correct but relies on implicit string-to-number conversion of `VARIABLE_VALUE` (which is VARCHAR in `performance_schema.global_status`). This works in practice but an explicit `CAST()` would be more robust.
- The `INNODB_BUFFER_PAGE` query can be expensive on production systems with large buffer pools, as it requires a full scan of buffer pool pages. The post could benefit from a warning about this in the future.
