# Validation Summary: How to Monitor MariaDB with the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MariaDB
- MySQL protocol and status queries
- OpenTelemetry Collector Contrib
- OpenTelemetry MySQL receiver
- OpenTelemetry Host Metrics receiver
- OTLP exporter
- Kubernetes Pods and sidecar containers
- SQL privileges and grants

## Sources Consulted
- OpenTelemetry Collector Contrib MySQL receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/mysqlreceiver
- OpenTelemetry Collector Contrib MySQL receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/mysqlreceiver/metadata.yaml
- OpenTelemetry Collector Contrib v0.104.0 MySQL receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.104.0/receiver/mysqlreceiver/metadata.yaml
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Contrib Host Metrics receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- MariaDB SHOW STATUS documentation: https://mariadb.com/docs/server/reference/sql-statements/administrative-sql-statements/show/show-status
- MariaDB SHOW ENGINE INNODB STATUS documentation: https://mariadb.com/docs/server/reference/sql-statements/administrative-sql-statements/show/show-engine-innodb-status
- MariaDB GRANT documentation: https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/grant

## Issues Found
- The post described the receiver as running `SHOW INNODB STATUS`. Updated this to describe `SHOW GLOBAL STATUS` plus InnoDB and performance schema queries, matching the receiver documentation and source.
- The SQL connectivity test used `SHOW GLOBAL STATUS LIMIT 5`, which is not valid MariaDB syntax. Changed it to `SHOW GLOBAL STATUS LIKE 'Uptime';`.
- Collector environment variable examples used `${VAR}`. Updated them to the documented `${env:VAR}` syntax.
- Several MySQL receiver metric names were incorrect or outdated, including `mysql.innodb.*`, `mysql.queries`, `mysql.slow_queries`, `mysql.threads.running`, `mysql.threads.connected`, and `mysql.replica.seconds_behind_source`. Replaced them with documented receiver metrics such as `mysql.buffer_pool.*`, `mysql.query.count`, `mysql.query.slow.count`, `mysql.threads` with `kind` attributes, and `mysql.replica.time_behind_source`.
- The connection saturation guidance used `mysql.connection.count`, which counts connection attempts rather than current active connections. Updated the recommendation to use `mysql.threads` with `kind="connected"`.
- The replication section listed SQL and IO thread running metrics that the MySQL receiver does not expose. Replaced them with documented replica lag and SQL delay metrics.
- The Kubernetes sidecar used an outdated Collector Contrib image tag. Updated it from `0.104.0` to `0.153.0`, the current release available at review time.
- The basic collector pipeline batched before adding resource attributes. Reordered processors to apply resource attributes before batching, consistent with common Collector pipeline practice.

## Review Notes
The MySQL receiver supports MariaDB, but some metrics are optional or only appear when the corresponding database feature and permissions are available. Replication metrics require the receiver to query replica status, so MariaDB deployments should grant the appropriate replication monitoring privilege on replicas when those metrics are enabled.
