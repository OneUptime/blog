# Validation Summary: How to Configure the SQL Query Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib SQL Query receiver
- OTLP HTTP exporter
- PostgreSQL
- MySQL
- Microsoft SQL Server
- PostgreSQL SQL permissions
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector Contrib SQL Query receiver documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/sqlqueryreceiver
- OpenTelemetry Collector Contrib SQL Query receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/sqlqueryreceiver
- OpenTelemetry Collector Contrib SQL Query receiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/sqlqueryreceiver/config.go
- OpenTelemetry Collector shared SQL query config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/internal/sqlquery/config.go
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- PostgreSQL predefined roles documentation: https://www.postgresql.org/docs/current/predefined-roles.html
- PostgreSQL GRANT documentation: https://www.postgresql.org/docs/current/sql-grant.html
- OneUptime OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The post said the receiver works with any SQL-compliant database and listed SQLite as supported. The upstream receiver supports a specific set of drivers and does not list SQLite, so the wording was changed to describe supported drivers and the driver list was corrected.
- The basic example commented that `value_type` controlled gauge versus sum metric type. In the receiver config, `value_type` controls `int` versus `double`; `data_type` controls `gauge` versus `sum`. The comment was corrected.
- The advanced scheduling example used per-query `collection_interval`, which is not supported by the receiver configuration. The example was updated to use multiple named `sqlquery` receiver instances, each with its own interval.
- The production example used unsupported fields `max_open_connections`, `max_idle_connections`, and `query_timeout`. The supported connection pool field is `max_open_conn`; the unsupported fields were removed, and troubleshooting guidance now points to database or driver-specific timeout settings.
- The monitoring section implied receiver-specific query execution metrics. The Collector exposes internal component metrics for accepted, refused, and failed metric points; the wording was adjusted to describe pipeline health metrics accurately.

## Review Notes
The SQL Query receiver metrics signal is currently alpha in OpenTelemetry Collector Contrib, so configuration fields and emitted metric behavior may change in future releases.
