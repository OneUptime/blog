# Validation Summary: How to Configure the SQL Server Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- SQL Server receiver
- Microsoft SQL Server
- SQL Server Dynamic Management Views
- Collector processors, exporters, pipelines, and internal telemetry
- OTLP HTTP export

## Sources Consulted
- OpenTelemetry Collector Contrib SQL Server receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/sqlserverreceiver
- OpenTelemetry Collector Contrib SQL Server receiver generated metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/sqlserverreceiver/documentation.md
- OpenTelemetry Collector Contrib SQL Server receiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/sqlserverreceiver/config.go
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation for environment variables: https://opentelemetry.io/docs/collector/configuration/
- Microsoft SQL Server DMV permissions documentation: https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-os-sys-info-transact-sql

## Issues Found
- Several receiver metric names were not documented SQL Server receiver metrics. Replaced them with supported names such as `sqlserver.page.buffer_cache.hit_ratio`, `sqlserver.user.connection.count`, `sqlserver.batch.request.rate`, `sqlserver.transaction_log.usage`, and direct-connection metrics such as `sqlserver.database.io`.
- The examples used unsupported receiver fields including `use_windows_auth`, `connection_pool`, `timeout`, `encrypt`, `trust_server_certificate`, and `database`. Removed or replaced them with documented fields, including `datasource` for connection-string options.
- Metric config entries included unsupported `description` fields. Removed those fields.
- Availability Group examples listed unsupported dedicated AG health metrics. Replaced that section with the documented `sqlserver.replica.data.rate` metric and clarified that dedicated AG role, health, state, and lag metrics are not exposed by this receiver.
- Query sample and top query collection were described like metrics. Clarified that `db.server.query_sample` and `db.server.top_query` are log events and need a logs pipeline when enabled.
- SQL Server permission guidance was incomplete and outdated for SQL Server 2022+. Updated it to include `VIEW ANY DATABASE`, `VIEW SERVER STATE` for SQL Server 2019 and earlier, and `VIEW SERVER PERFORMANCE STATE` for SQL Server 2022 and later.
- Environment-variable examples used legacy shorthand. Updated examples to the current Collector form, `${env:VARIABLE}`.
- Internal telemetry metric `otelcol_receiver_scraped_metric_points` was incorrect. Replaced it with `otelcol_scraper_scraped_metric_points`.

## Review Notes
The SQL Server receiver's metrics are currently beta, while SQL Server receiver log events are development stability. Some documented metrics are only available through Windows Performance Counters, and some require direct SQL Server connection; the post now calls out that distinction.
