# Validation Summary: How to Monitor MySQL InnoDB Buffer Pool, Slow Query Rate, and Thread State

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector MySQL receiver
- OpenTelemetry Collector filelog receiver
- MySQL
- InnoDB buffer pool metrics
- MySQL slow query log
- MySQL PROCESSLIST and server status variables

## Sources Consulted
- OpenTelemetry Collector Contrib MySQL receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/mysqlreceiver/README.md
- OpenTelemetry Collector Contrib MySQL receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/mysqlreceiver/metadata.yaml
- OpenTelemetry Collector Contrib filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- MySQL 8.4 Reference Manual, Slow Query Log: https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html
- MySQL 8.4 Reference Manual, Server Status Variables: https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html
- MySQL 8.4 Reference Manual, SHOW PROCESSLIST Statement: https://dev.mysql.com/doc/refman/8.4/en/show-processlist.html

## Issues Found
- The Collector configuration used obsolete or incorrect MySQL receiver metric names: `mysql.queries`, `mysql.slow_queries`, `mysql.connections`, and `mysql.table_locks`. Updated them to current receiver metric names: `mysql.query.count`, `mysql.query.slow.count`, `mysql.connection.count`, and `mysql.locks`.
- The environment variable syntax used `password: "${MYSQL_PASSWORD}"`. Updated it to the current Collector configuration form, `password: "${env:MYSQL_PASSWORD}"`.
- The buffer pool hit ratio formula had the numerator and denominator reversed and used raw cumulative counters. Updated it to calculate `1 - reads/read_requests` over rates.
- Several metric attribute names were incorrect. Updated buffer pool operation attributes from `type` to `operation`, buffer pool page attributes from `status` to `kind`, thread attributes from `status` to `kind`, and row lock attributes from `status` to `kind`.
- Dirty buffer pool pages were described as `mysql.buffer_pool.pages{status="dirty"}`, which is not emitted by the MySQL receiver. Updated it to `mysql.buffer_pool.data_pages{status="dirty"}`.
- The `mysql.buffer_pool.page_flushes` description said it represented pages flushed. Updated it to match the receiver metadata: requests to flush pages from the buffer pool.
- The slow query metric examples and alert used `mysql.slow_queries`. Updated them to `mysql.query.slow.count`.
- The connection-count alert used non-existent `mysql.connections`. Updated it to use `mysql.threads{kind="connected"}` for current connected threads.
- The slow query log runtime setup omitted the log destination. Added `SET GLOBAL log_output = 'FILE';` so the named slow query log file is actually used.
- The summary said the receiver collects metrics only from internal status variables. Updated it to say global status and InnoDB tables, matching the receiver documentation.

## Review Notes
The alert condition snippets remain pseudo-YAML rather than a complete Prometheus rule file or vendor-specific alerting format. That is acceptable for a conceptual monitoring guide, but a future revision could label them as examples for a specific backend.
