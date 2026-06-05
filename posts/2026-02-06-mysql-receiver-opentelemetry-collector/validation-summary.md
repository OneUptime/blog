# Validation Summary: How to Configure the MySQL Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry MySQL receiver
- MySQL and MariaDB monitoring
- Collector processors and exporters
- Kubernetes sidecar deployment
- Prometheus alerting
- OTLP export

## Sources Consulted
- OpenTelemetry Collector Contrib MySQL receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/mysqlreceiver/README.md
- OpenTelemetry Collector Contrib MySQL receiver generated documentation and metrics list: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/mysqlreceiver/documentation.md
- OpenTelemetry Collector Contrib MySQL receiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/mysqlreceiver/config.go
- OpenTelemetry Collector debug exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector metrics transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector OTLP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- MySQL documentation for Performance Schema and replication status commands: https://dev.mysql.com/doc/refman/8.0/en/performance-schema.html and https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html

## Issues Found
- The basic example used the deprecated/removed `logging` exporter with `loglevel`. Replaced it with the current `debug` exporter and `verbosity`.
- Multiple metric names did not match the current MySQL receiver metadata, including `mysql.connections`, `mysql.queries`, `mysql.slow_queries`, `mysql.table_locks.*`, and `mysql.innodb.*`. Updated the metrics list and configuration examples to current receiver metric names such as `mysql.threads`, `mysql.query.count`, `mysql.query.slow.count`, `mysql.locks`, `mysql.operations`, `mysql.row_locks`, and `mysql.row_operations`.
- The post listed `mysql.replica.lag`, which is not a documented MySQL receiver metric. Removed it.
- The replication example used unsupported receiver `resource_attributes` and non-existent per-role resource attribute values. Removed those invalid blocks.
- The custom SQL section used unsupported `statements` syntax. Replaced it with supported `statement_events`, built-in table metrics, and the supported `db.server.query_sample` event configuration.
- The production filter processor example used older include/exclude configuration. Updated it to the current OTTL-based `metric_conditions` syntax.
- The production example used the deprecated `metricstransform` processor type. Updated it to the current `metrics_transform` type.
- The internal telemetry example used `service.telemetry.metrics.address`, which is ignored in current Collector versions. Replaced it with the current `readers.pull.exporter.prometheus` configuration.
- Prometheus alert expressions used OTLP dotted metric names and metrics that do not exist. Updated the alert expressions to normalized Prometheus-style names for the metrics that the receiver emits.
- The Kubernetes sidecar used `command` for the Collector config flag, which would replace the image entrypoint. Changed it to `args`.
- The diagram referenced only `SHOW STATUS` and `SHOW SLAVE STATUS`. Updated it to `SHOW GLOBAL STATUS` and version-dependent `SHOW REPLICA STATUS / SHOW SLAVE STATUS`.

## Review Notes
- The MySQL receiver's metrics support is beta, while log/event collection is development status upstream.
- The Prometheus examples assume the default Prometheus exporter translation behavior and no additional `namespace` prefix. If a namespace is configured, alert metric names need to include that prefix.
