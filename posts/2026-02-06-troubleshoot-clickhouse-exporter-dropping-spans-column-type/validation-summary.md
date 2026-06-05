# Validation Summary: How to Troubleshoot ClickHouse Exporter Dropping Spans Due to Column Type

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector ClickHouse exporter
- ClickHouse SQL and system tables
- Kubernetes `kubectl logs`
- Prometheus alerting

## Sources Consulted
- OpenTelemetry Collector ClickHouse exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/clickhouseexporter/README.md
- OpenTelemetry Collector ClickHouse exporter trace table DDL: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/exporter/clickhouseexporter/internal/sqltemplates/traces_table.sql
- OpenTelemetry Collector ClickHouse exporter trace insert SQL: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/exporter/clickhouseexporter/internal/sqltemplates/traces_insert.sql
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- ClickHouse ALTER COLUMN documentation: https://clickhouse.com/docs/sql-reference/statements/alter/column
- ClickHouse CREATE TABLE documentation: https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse DESCRIBE TABLE documentation: https://clickhouse.com/docs/sql-reference/statements/describe-table
- ClickHouse `system.query_log` documentation: https://clickhouse.com/docs/operations/system-tables/query_log

## Issues Found
- The post used ClickHouse code 117 for an unknown-column example. ClickHouse unknown identifier/column errors are typically code 47, while code 117 is used for incorrect input data cases such as unknown fields while parsing formats. Updated the example and diagnosis list to use code 47 for unknown identifiers or columns.
- The sample `ALTER TABLE` migration used plain `String` and `Map(String, String)` types. The current ClickHouse exporter trace DDL uses `LowCardinality(String)` for `StatusCode` and `Map(LowCardinality(String), String)` for attributes, with ZSTD codecs. Updated the example to better match the exporter's schema.
- The post said `create_schema: true` attempts to create or update the table schema. The exporter documentation says it runs DDL to create the database and tables, while existing-table upgrades still require manual column additions or migrations. Updated the wording.
- The monitoring snippet did not mention that Collector internal metric names may differ when exposed through Prometheus suffix behavior. Added the `_total` caveat while leaving the main alert on the raw metric name.

## Review Notes
The post is technically relevant and accurate after the corrections. Future improvements could include naming the exact Collector/exporter version whose schema changed, because ClickHouse exporter schema details are version-specific.
