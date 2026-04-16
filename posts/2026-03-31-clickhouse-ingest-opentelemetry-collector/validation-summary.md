# Validation Summary: How to Ingest Data from OpenTelemetry Collector to ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector (Contrib distribution)
- ClickHouse Exporter (`clickhouseexporter`)
- ClickHouse
- OTLP receiver (gRPC/HTTP)
- Docker / Docker Compose
- YAML configuration
- SQL (ClickHouse dialect)

## Sources Consulted
- OpenTelemetry Collector Contrib — ClickHouse Exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/clickhouseexporter
- ClickHouse Exporter source documentation (configuration fields, default table names, endpoint formats, compression options)
- Auto-generated ClickHouse schema column names for `otel_traces`, `otel_logs`, and the `otel_metrics_*` tables

## Issues Found
- **Invalid config field `metrics_table_name`**: The ClickHouse exporter does not have a single `metrics_table_name` field. Metrics are written to separate tables per metric type (gauge, sum, summary, histogram, exponential_histogram), and the correct configuration field is `metrics_tables` (plural) with sub-fields per type. Fixed by replacing `metrics_table_name: otel_metrics` with the correct `metrics_tables` structure using the default per-type table names.

## Review Notes
- `endpoint: tcp://clickhouse:9000` is valid; the exporter also supports `http://`, `https://`, and `clickhouse://` schemes.
- `compress: lz4` is the default and a valid value; other supported values include `none`, `zstd`, `gzip`, `deflate`, `br`.
- `ttl: 72h` uses the supported duration format.
- Trace column names (`TraceId`, `SpanName`, `Duration`) and log column names (`Timestamp`, `Body`, `ServiceName`, `SeverityText`) match the auto-generated schema. `Duration` is stored in nanoseconds, so `Duration > 1000000000` for 1 second and `Duration / 1e6` for milliseconds are both correct.
- `create_schema: true` is the default; keeping it explicit is fine for clarity.
- The Docker Compose snippet uses the floating `latest`-style tag by omitting one explicitly; pinning to a specific version (e.g., `otel/opentelemetry-collector-contrib:0.x.y`) would be safer for reproducibility in production but is not technically incorrect.
