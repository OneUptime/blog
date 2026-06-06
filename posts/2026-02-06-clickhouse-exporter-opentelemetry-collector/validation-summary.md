# Validation Summary: How to Configure the ClickHouse Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector ClickHouse exporter
- ClickHouse
- ClickHouse SQL, MergeTree, Distributed, AggregatingMergeTree
- OTLP
- TLS and HTTP/native ClickHouse connections

## Sources Consulted
- OpenTelemetry Collector Contrib ClickHouse exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/clickhouseexporter/README.md
- OpenTelemetry Collector Contrib ClickHouse exporter configuration source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/clickhouseexporter/config.go
- OpenTelemetry Collector Contrib ClickHouse exporter SQL templates: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/clickhouseexporter/internal/sqltemplates
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- ClickHouse Go driver README and DSN settings: https://github.com/ClickHouse/clickhouse-go
- ClickHouse materialized view aggregation guidance: https://clickhouse.com/blog/using-materialized-views-in-clickhouse

## Issues Found
- The post stated that tables must be created before sending data. Updated this to explain that the exporter creates schema by default and that production deployments can manage schema explicitly with `create_schema: false`.
- The trace and log table schemas were stale compared with the current exporter defaults. Updated column types, indexes, log materialized columns, and ordering to match the current exporter SQL templates.
- Several ClickHouse driver options were shown as top-level exporter fields. Moved connection pool and strategy settings under `connection_params`, and replaced the invalid `lifo` strategy with `round_robin`.
- `metrics_table_name` is deprecated for current exporter configuration. Replaced it with `metrics_tables` entries for each metric type.
- `wait_for_async_insert` was shown as a top-level exporter field. Moved it under `connection_params`, where ClickHouse settings belong.
- The TLS example used `clickhouses://`, which is not the documented ClickHouse Go driver DSN form. Replaced it with `clickhouse://...?secure=true`.
- The HTTP example used unsupported `compression` and `headers` exporter fields. Replaced `compression` with the supported `compress` field and removed unsupported custom headers.
- The production YAML had duplicate top-level `extensions` blocks. Merged `health_check` and `file_storage` into a single `extensions` block.
- Collector environment variable examples used older `${VAR}` syntax. Updated them to the current `${env:VAR}` syntax.
- The distributed table section configured a distributed logs table that was not created in the SQL example. Removed that config line.
- The materialized view used `SummingMergeTree` with average and quantile aggregate results. Replaced it with `AggregatingMergeTree` and aggregate state functions.
- Collector self-metric names used the old `otel_exporter_*` form. Updated them to current `otelcol_exporter_*` names.
- The trace error query compared `StatusCode` to `ERROR`; the exporter stores the span status text as `Error`. Updated the query.
- Removed unsupported numeric compression-ratio claims that were not backed by the consulted official documentation.

## Review Notes
The post is now technically consistent with the current OpenTelemetry Collector Contrib ClickHouse exporter documentation and source. The exporter is still beta for traces/logs and alpha for metrics, so schema and configuration details should be rechecked against the exporter README and changelog during future collector upgrades.
