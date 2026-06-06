# Validation Summary: How to Use ClickHouse as a High-Performance OpenTelemetry Backend

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib ClickHouse exporter
- ClickHouse
- Docker
- SQL
- Grafana ClickHouse data source

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporter component list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Contrib ClickHouse exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/clickhouseexporter/README.md
- OpenTelemetry Collector Contrib ClickHouse exporter SQL templates: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/clickhouseexporter/internal/sqltemplates
- ClickHouse Docker official image documentation: https://hub.docker.com/_/clickhouse
- ClickHouse MergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse LowCardinality documentation: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse Map data type documentation: https://clickhouse.com/docs/sql-reference/data-types/map
- ClickHouse Nested data type documentation: https://clickhouse.com/docs/sql-reference/data-types/nested-data-structures/nested

## Issues Found
- The post said the Docker HTTP port was used by the ClickHouse exporter, but the sample exporter configuration uses the native TCP protocol on port 9000. Updated the wording to explain that the exporter supports both protocols and that the shown configuration uses the native protocol.
- The schema section claimed to provide schemas for traces, logs, and metrics, but only trace and log schemas were present. Updated the wording to explain that metrics are split into separate tables by metric type and are created by the exporter in the shown configuration.
- The trace table used `Duration Int64`, while the current exporter template uses `Duration UInt64`. Updated the type and aligned the ordering and TTL settings with the exporter template.
- The log table omitted columns inserted by the current exporter, including resource schema URL, scope schema URL, scope metadata, and scope attributes. Added those columns and corrected `TraceFlags` and `SeverityNumber` to unsigned 8-bit types.
- The Collector configuration used an invalid `metrics_table_name` setting. Replaced it with the current `metrics_tables` configuration for gauge, sum, summary, histogram, and exponential histogram tables.
- The latency query filtered `SpanKind = 'SPAN_KIND_SERVER'`, but the exporter stores the Collector span kind string. Updated it to `SpanKind = 'Server'`.

## Review Notes
The schemas are intentionally still examples. For production, the exporter documentation recommends keeping custom schemas compatible with the exporter insert columns and checking the SQL templates and changelog when upgrading Collector contrib.
