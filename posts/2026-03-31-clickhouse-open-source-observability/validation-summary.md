# Validation Summary: How to Use ClickHouse with Open Source Observability Stacks

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- ClickHouse (MergeTree engine, DateTime64, LowCardinality, Map types, TTL)
- OpenTelemetry Collector (ClickHouse exporter from opentelemetry-collector-contrib)
- Grafana (ClickHouse data source plugin, dashboard macros)
- Vector (mentioned as alternative collector)
- OneUptime (mentioned for alerting)

## Sources Consulted
- ClickHouse SQL reference for CREATE TABLE, MergeTree engine, DateTime64, LowCardinality, Map, TTL syntax: https://clickhouse.com/docs/en/sql-reference
- OpenTelemetry Collector Contrib ClickHouse exporter config source and README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/clickhouseexporter
- Grafana ClickHouse data source plugin documentation for query macros ($__fromTime, $__toTime): https://grafana.com/docs/plugins/grafana-clickhouse-datasource/
- W3C Trace Context specification for trace ID format: https://www.w3.org/TR/trace-context/

## Issues Found
1. **Incorrect TTL value format in OTel Collector config**: The `ttl` field was set to `30` (a bare integer), but the ClickHouse exporter expects a Go `time.Duration` value. Changed `ttl: 30` to `ttl: 720h` (720 hours = 30 days) to match the exporter's expected configuration format.

## Review Notes
- The `metrics_table_name` field in the OTel Collector config is deprecated in newer versions of the ClickHouse exporter. The current approach uses a `metrics_tables` config with sub-keys for each metric type (gauge, sum, summary, histogram, exponential_histogram). The deprecated field still works but may be removed in a future release.
- The OTel Collector config snippet is partial — it omits the `receivers` block (e.g., `receivers: otlp: protocols: grpc: http:`). This is acceptable for a focused tutorial but readers copying the config verbatim will need to add receiver definitions.
- The single flat `otel_metrics` table schema is a simplification. The OTel ClickHouse exporter by default creates separate tables per metric type to handle different metric semantics (gauges vs. histograms vs. summaries). The simplified schema works for basic gauge/counter metrics but wouldn't capture histogram bucket boundaries or summary quantiles.
- The config code block uses `text` language identifier instead of `yaml`, which prevents syntax highlighting. Not a technical error but reduces readability.
- The exporter's `ttl` setting is redundant when tables are pre-created with their own TTL clauses (as shown in the schema section). The exporter applies its TTL only when it creates tables itself.
