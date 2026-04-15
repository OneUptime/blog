# How to Use ClickHouse with Zipkin for Trace Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Zipkin, Distributed Tracing, Observability, OpenTelemetry

Description: Learn how to route Zipkin span data into ClickHouse using an OpenTelemetry Collector pipeline for scalable, long-term trace storage.

---

## Why ClickHouse for Zipkin Trace Storage

Zipkin's built-in storage (MySQL, Cassandra, Elasticsearch) works well at modest scale but becomes costly at high span ingest rates. ClickHouse's columnar compression and fast aggregations make it an efficient alternative for long-term trace retention and cross-trace analytics.

## Architecture Overview

```text
Application (Zipkin SDK)
        |
        v
OpenTelemetry Collector
  [zipkinreceiver -> clickhouseexporter]
        |
        v
ClickHouse (otel_traces table)
```

## OpenTelemetry Collector Configuration

```yaml
receivers:
  zipkin:
    endpoint: 0.0.0.0:9411

processors:
  batch:
    timeout: 5s
    send_batch_size: 10000

exporters:
  clickhouse:
    endpoint: tcp://clickhouse:9000
    database: otel
    traces_table_name: otel_traces
    ttl: 720h    # 30 days
    compress: lz4

service:
  pipelines:
    traces:
      receivers: [zipkin]
      processors: [batch]
      exporters: [clickhouse]
```

## ClickHouse Table Schema (Simplified)

The exporter auto-creates a more detailed schema with additional columns (SpanKind, ResourceAttributes, ScopeName, StatusMessage, Events, Links) and data-skipping indexes. Below is the core subset:

```sql
CREATE TABLE otel.otel_traces (
  Timestamp           DateTime64(9) CODEC(Delta, ZSTD(1)),
  TraceId             String CODEC(ZSTD(1)),
  SpanId              String CODEC(ZSTD(1)),
  ParentSpanId        String CODEC(ZSTD(1)),
  SpanName            LowCardinality(String) CODEC(ZSTD(1)),
  ServiceName         LowCardinality(String) CODEC(ZSTD(1)),
  Duration            UInt64 CODEC(ZSTD(1)),
  StatusCode          LowCardinality(String) CODEC(ZSTD(1)),
  SpanAttributes      Map(LowCardinality(String), String) CODEC(ZSTD(1))
) ENGINE = MergeTree()
PARTITION BY toDate(Timestamp)
ORDER BY (ServiceName, SpanName, toDateTime(Timestamp))
TTL toDate(Timestamp) + INTERVAL 30 DAY
```

## Docker Compose Setup

```yaml
version: '3.8'
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-config.yaml:/etc/otel/config.yaml
    command: ["--config", "/etc/otel/config.yaml"]
    ports:
      - "9411:9411"
    depends_on:
      - clickhouse

  clickhouse:
    image: clickhouse/clickhouse-server:24.3
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - ch-data:/var/lib/clickhouse

volumes:
  ch-data:
```

## Querying Zipkin Traces in ClickHouse

```sql
SELECT
  TraceId,
  ServiceName,
  SpanName,
  Duration / 1e6 AS duration_ms
FROM otel.otel_traces
WHERE
  ServiceName = 'checkout-service'
  AND Timestamp >= now() - INTERVAL 1 HOUR
  AND Duration > 1000000000  -- over 1 second
ORDER BY Duration DESC
LIMIT 25
```

## Summary

Route Zipkin span data into ClickHouse via an OpenTelemetry Collector with a `zipkinreceiver` and `clickhouseexporter`. The collector handles buffering, batching, and schema creation. ClickHouse stores spans in a partitioned MergeTree table with TTL-based expiry. Direct ClickHouse queries enable cross-trace analytics beyond Zipkin's built-in UI capabilities.
