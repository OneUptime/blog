# Validation Summary: How to Configure the PostgreSQL Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / technical configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- PostgreSQL receiver
- SQL Query receiver
- PostgreSQL monitoring views and predefined roles
- pg_stat_statements
- Prometheus alert rules
- OTLP and Prometheus exporters

## Sources Consulted
- OpenTelemetry Collector Contrib PostgreSQL receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/postgresqlreceiver/README.md
- OpenTelemetry Collector Contrib PostgreSQL receiver generated metric documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/postgresqlreceiver/documentation.md
- OpenTelemetry Collector Contrib PostgreSQL receiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/postgresqlreceiver/config.go
- OpenTelemetry Collector Contrib SQL Query receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/sqlqueryreceiver/README.md
- OpenTelemetry Collector Contrib Filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector logging exporter replacement announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- PostgreSQL predefined roles documentation: https://www.postgresql.org/docs/current/predefined-roles.html
- PostgreSQL pg_stat_statements documentation: https://www.postgresql.org/docs/current/pgstatstatements.html

## Issues Found
- Replaced the deprecated/removed `logging` exporter and `loglevel` option with the current `debug` exporter and `verbosity` option.
- Corrected non-existent PostgreSQL receiver metric names such as `postgresql.connection.usage`, `postgresql.transactions.rate`, `postgresql.buffers_alloc`, `postgresql.buffers_backend`, and `postgresql.rows.*`.
- Updated replication delay naming from `postgresql.wal.lag` to `postgresql.wal.delay` for the precise lag metric feature gate.
- Removed invalid PostgreSQL receiver `resource_attributes` values and used resource processors in separate primary and replica pipelines.
- Replaced invalid PostgreSQL receiver `statements` custom-query examples with documented SQL Query receiver `queries` examples.
- Corrected SQL Query receiver metric configuration by using `data_type: sum` instead of unsupported `counter`, moving `attribute_columns` to the query level, and fixing table-size SQL identifier quoting.
- Removed unsupported PostgreSQL receiver TLS `min_version`; the receiver rejects `MinVersion` and `MaxVersion`.
- Updated the filter processor example to the current OTTL-based `metric_conditions` format and corrected the database resource attribute name to `postgresql.database.name`.
- Updated Collector internal telemetry metrics exposure from ignored `service.telemetry.metrics.address` to the current `readers` configuration.
- Reworked the PgBouncer example to use SQL Query receiver `SHOW LISTS` collection instead of treating PgBouncer as a normal PostgreSQL receiver target.
- Added the required `shared_preload_libraries` restart caveat for `pg_stat_statements` and used `pg_read_all_stats` for cross-user query text/query ID visibility.
- Corrected Prometheus alert examples to use Prometheus-compatible metric identifiers and a proper buffer cache hit ratio based on `postgresql_blks_hit` and `postgresql_blks_read`.

## Review Notes
All YAML snippets were parsed successfully after edits. The PostgreSQL receiver is a contrib component, so users need an OpenTelemetry Collector distribution that includes contrib receivers such as `otelcol-contrib`.
