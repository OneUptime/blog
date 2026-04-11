# Validation Summary: How to Monitor MySQL Replication Lag with Alerts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL replication (SHOW SLAVE STATUS, Performance Schema)
- Bash scripting for monitoring
- Prometheus alerting rules (PromQL)
- mysqld_exporter metrics
- Nagios plugin conventions

## Sources Consulted
- MySQL 8.0 Reference Manual — SHOW REPLICA STATUS: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual — replication_applier_status_by_worker table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-by-worker-table.html
- MySQL 8.0 Reference Manual — Replication and Binary Logging Options (slave_parallel_type, slave_parallel_workers): https://dev.mysql.com/doc/refman/8.0/en/replication-options-replica.html
- Prometheus mysqld_exporter metrics documentation: https://github.com/prometheus/mysqld_exporter
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
No technical issues found.

## Review Notes
- MySQL 8.0.22+ introduced `SHOW REPLICA STATUS` as the preferred replacement for `SHOW SLAVE STATUS`, and renamed fields like `Seconds_Behind_Master` to `Seconds_Behind_Source`. The post uses the legacy terminology, which still works but is deprecated. A future update could mention both forms.
- MySQL 8.0.26+ renamed `slave_parallel_type` and `slave_parallel_workers` to `replica_parallel_type` and `replica_parallel_workers`. The old names still function but are deprecated.
- The comment "NULL = IO thread not connected" for `Seconds_Behind_Master` is a simplification. NULL can also occur when the SQL thread is not running or when no events have been received from the primary. This is acceptable shorthand for a monitoring-focused post.
- The bash script exposes the MySQL password on the command line (`-pmonitor_secret`), which is standard for examples but would trigger a MySQL warning in practice. The post could note the use of `mysql_config_editor` or a `.my.cnf` file as a more secure alternative, but this is a style choice, not a technical error.
