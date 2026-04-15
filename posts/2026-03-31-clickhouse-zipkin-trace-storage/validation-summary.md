# Validation Summary: How to Use ClickHouse with Zipkin for Trace Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (columnar OLAP database)
- Zipkin (distributed tracing system)
- OpenTelemetry Collector (with contrib distribution)
- OpenTelemetry Collector ClickHouse Exporter
- OpenTelemetry Collector Zipkin Receiver
- Docker Compose

## Sources Consulted
- OpenTelemetry Collector Contrib ClickHouse exporter README and config.go — https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/clickhouseexporter
- OpenTelemetry Collector Contrib ClickHouse exporter traces schema — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/clickhouseexporter/internal/sqltemplates/traces_table.sql
- OpenTelemetry Collector Contrib Zipkin receiver — https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/zipkinreceiver
- Zipkin architecture and storage backends — https://github.com/openzipkin/zipkin
- ClickHouse SQL syntax documentation (DateTime functions, intervals, scientific notation)
- Docker Hub: otel/opentelemetry-collector-contrib and clickhouse/clickhouse-server image repositories

## Issues Found

### 1. Duration column type was `Int64` instead of `UInt64`
- **What was wrong:** The ClickHouse table schema listed `Duration Int64 CODEC(ZSTD(1))`.
- **What was changed:** Corrected to `Duration UInt64 CODEC(ZSTD(1))`.
- **Why:** The actual exporter source uses `UInt64` (unsigned) for duration since span durations in nanoseconds cannot be negative.

### 2. ORDER BY used `toUnixTimestamp()` instead of `toDateTime()`
- **What was wrong:** The ORDER BY clause used `toUnixTimestamp(Timestamp)`.
- **What was changed:** Corrected to `toDateTime(Timestamp)`.
- **Why:** The actual exporter source generates `ORDER BY (ServiceName, SpanName, toDateTime(Timestamp))`. `toUnixTimestamp` returns a UInt32 epoch value, while the exporter uses `toDateTime` which truncates to second-precision DateTime — semantically different functions.

### 3. Schema section header was misleading
- **What was wrong:** The section was titled "ClickHouse Table Schema (Auto-Created by Exporter)", implying the shown schema was the complete auto-created schema.
- **What was changed:** Renamed to "ClickHouse Table Schema (Simplified)" and added a note explaining the actual schema includes additional columns (SpanKind, ResourceAttributes, ScopeName, StatusMessage, Events, Links) and data-skipping indexes.
- **Why:** The actual auto-created schema has 10+ additional columns, nested structures (Events, Links), 6 bloom filter/minmax indexes, and engine settings. Presenting a subset as the auto-created schema would be misleading to readers.

## Review Notes
- The OTel Collector configuration is fully correct: `tcp://` endpoint format, `compress: lz4`, `traces_table_name`, `ttl: 720h`, and `database: otel` are all valid top-level config fields per the exporter's config.go.
- The Zipkin receiver config using `0.0.0.0:9411` is correct (default is `localhost:9411`; binding to all interfaces is standard for Docker).
- The ClickHouse SQL query syntax is valid: `now() - INTERVAL 1 HOUR`, scientific notation `1e6`, and the duration math (nanoseconds / 1e6 = milliseconds) are all correct.
- Docker images `otel/opentelemetry-collector-contrib:latest` and `clickhouse/clickhouse-server:24.3` are confirmed valid on Docker Hub.
- Zipkin's MySQL backend is listed as a peer to Cassandra and Elasticsearch, though MySQL is classified as a legacy "v1" component in Zipkin's documentation and is not recommended for production. This is a minor nuance and not technically wrong — it does exist as a built-in storage option.
- The `version: '3.8'` in Docker Compose is deprecated in Docker Compose v2 (silently ignored), but not technically incorrect.
- The TTL expression in the blog (`toDate(Timestamp) + INTERVAL 30 DAY`) differs from what the exporter actually generates (`Timestamp + toIntervalDay(N)`), but both are valid ClickHouse SQL. This is covered by the simplified schema disclaimer.
