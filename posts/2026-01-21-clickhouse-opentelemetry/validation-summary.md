# Validation Summary: How to Stream OpenTelemetry Data to ClickHouse

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- ClickHouse
- OpenTelemetry Collector
- OpenTelemetry ClickHouse exporter
- OTLP receiver
- ClickHouse SQL and MergeTree tables
- Grafana ClickHouse data source

## Sources Consulted
- OpenTelemetry Collector ClickHouse exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/clickhouseexporter/README.md
- OpenTelemetry Collector ClickHouse exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/clickhouseexporter/config.go
- OpenTelemetry Collector ClickHouse exporter SQL templates: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/clickhouseexporter/internal/sqltemplates
- OpenTelemetry Collector exporter helper queue batching docs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- ClickHouse asynchronous inserts docs: https://clickhouse.com/docs/optimize/asynchronous-inserts
- ClickHouse table settings manipulation docs: https://clickhouse.com/docs/sql-reference/statements/alter/setting
- ClickHouse quantilePrometheusHistogram docs: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantilePrometheusHistogram
- ClickHouse MergeTree settings docs: https://clickhouse.com/docs/operations/settings/merge-tree-settings

## Issues Found
- The ClickHouse exporter configuration used `ttl_days`, which is not a current exporter option. Changed it to `ttl: 720h`.
- The configuration used deprecated `metrics_table_name` and implied a single metrics table. Updated it to `metrics_tables` with per-type gauge, sum, summary, histogram, and exponential histogram tables.
- The trace schema omitted exporter-required columns and used `Duration Int64`; the exporter inserts `ScopeName`, `ScopeVersion`, and `Duration UInt64`. Updated the schema and indexes to match the exporter templates more closely.
- The trace lookup materialized view had extra aggregate columns that do not match the exporter-created lookup table. Replaced it with the exporter-compatible trace ID timestamp lookup shape.
- The metrics schema incorrectly stored all metric types in one table. Updated the post to show per-type gauge and histogram tables and changed rollups and queries to use `TimeUnix` and the type-specific tables.
- The logs schema used `ObservedTimestamp` and a generic `Attributes` column, but the exporter inserts `TraceFlags`, scope/resource fields, and `LogAttributes`. Updated the table and log correlation query accordingly.
- The high-volume Collector self-telemetry snippet used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later. Replaced it with the current Prometheus reader syntax.
- The histogram query used `histogramQuantile`, which is not a ClickHouse function. Replaced it with `quantilePrometheusHistogram` over array-expanded cumulative buckets.
- The async insert tuning snippet used `ALTER TABLE ... MODIFY SETTING` for `async_insert`, but async insert is a user/query/client setting, not a MergeTree table setting. Replaced it with `ALTER USER default SETTINGS ...`.

## Review Notes
- The corrected histogram quantile query uses `quantilePrometheusHistogram`, which is documented in current ClickHouse docs and requires ClickHouse versions that include that aggregate function.
- The OpenTelemetry ClickHouse exporter is still marked alpha for metrics and beta for traces/logs in the contrib documentation, so schema details can change across exporter upgrades.
- YAML snippets were parsed successfully with PyYAML after edits.
