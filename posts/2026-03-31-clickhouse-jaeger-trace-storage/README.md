# How to Use ClickHouse with Jaeger for Trace Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Jaeger, Distributed Tracing, Observability, OpenTelemetry

Description: Learn how to configure Jaeger to use ClickHouse as its trace storage backend for scalable, long-term distributed trace retention.

---

## Why ClickHouse as Jaeger Storage

Jaeger's default storage backends (Cassandra, Elasticsearch) are operationally heavy and expensive at scale. ClickHouse offers high ingest throughput, excellent query performance for span searches, and cheap long-term retention - making it a strong backend for production Jaeger deployments.

## jaeger-clickhouse Plugin

The community [`jaeger-clickhouse`](https://github.com/jaegertracing/jaeger-clickhouse) storage plugin implements Jaeger's gRPC storage plugin API on top of ClickHouse. Note that this plugin is **experimental and no longer actively maintained** (last release `0.13.0`, November 2022) and only targets Jaeger v1's `grpc-plugin` API, which was removed in Jaeger v1.58. Native ClickHouse support is being added directly to Jaeger v2 - see [jaegertracing/jaeger#5058](https://github.com/jaegertracing/jaeger/issues/5058).

The plugin is distributed as a Go binary (no official container image is published); you build it from source:

```bash
git clone https://github.com/jaegertracing/jaeger-clickhouse.git
cd jaeger-clickhouse
make build
```

The output binary is `jaeger-clickhouse-linux-amd64` (or your platform equivalent) under the project directory.

## ClickHouse Schema

The plugin auto-creates its tables on startup (controlled by `init_tables` in `config.yaml`). Two main tables back span storage. The first stores the full encoded span (JSON or Protobuf) keyed by trace id:

```sql
CREATE TABLE IF NOT EXISTS jaeger_spans_local (
  timestamp DateTime CODEC(Delta, ZSTD(1)),
  traceID   String   CODEC(ZSTD(1)),
  model     String   CODEC(ZSTD(3))
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY traceID
SETTINGS index_granularity = 1024
```

The second is the searchable index that powers the Jaeger UI's trace search:

```sql
CREATE TABLE IF NOT EXISTS jaeger_index_local (
  timestamp  DateTime           CODEC(Delta, ZSTD(1)),
  traceID    String             CODEC(ZSTD(1)),
  service    LowCardinality(String) CODEC(ZSTD(1)),
  operation  LowCardinality(String) CODEC(ZSTD(1)),
  durationUs UInt64             CODEC(ZSTD(1)),
  tags Nested(
    key   LowCardinality(String),
    value String
  ) CODEC(ZSTD(1)),
  INDEX idx_tag_keys tags.key  TYPE bloom_filter(0.01) GRANULARITY 64,
  INDEX idx_duration durationUs TYPE minmax GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (service, -toUnixTimestamp(timestamp))
SETTINGS index_granularity = 1024
```

A `jaeger_operations` materialized view tracks distinct service/operation pairs for the search UI's dropdowns. TTL is added when the `ttl` (days) option is set in `config.yaml`.

## Docker Compose Example

The plugin is a binary that Jaeger spawns as a sub-process via the gRPC plugin mechanism - it is not a standalone service. Build the binary, mount it into the Jaeger container, and provide a `config.yaml` describing the ClickHouse connection:

```yaml
# config.yaml
address: clickhouse:9000
database: default
init_tables: true
ttl: 30
```

```yaml
version: '3.8'
services:
  clickhouse:
    image: clickhouse/clickhouse-server:24.3
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - clickhouse-data:/var/lib/clickhouse

  jaeger:
    image: jaegertracing/all-in-one:1.57  # last version supporting grpc-plugin
    environment:
      SPAN_STORAGE_TYPE: grpc-plugin
    command:
      - "--grpc-storage-plugin.binary=/plugin/jaeger-clickhouse"
      - "--grpc-storage-plugin.configuration-file=/plugin/config.yaml"
    volumes:
      - ./jaeger-clickhouse-linux-amd64:/plugin/jaeger-clickhouse:ro
      - ./config.yaml:/plugin/config.yaml:ro
    ports:
      - "16686:16686"
      - "14268:14268"
    depends_on:
      - clickhouse

volumes:
  clickhouse-data:
```

## Querying Traces in ClickHouse Directly

Use the index table's column names (`service`, `operation`, `durationUs`, `traceID`):

```sql
SELECT
  traceID,
  service,
  operation,
  durationUs / 1000 AS duration_ms
FROM jaeger_index_local
WHERE
  service = 'payment-service'
  AND timestamp >= now() - INTERVAL 1 HOUR
  AND durationUs > 500000  -- slower than 500ms
ORDER BY durationUs DESC
LIMIT 20
```

## Retention Configuration

Set `ttl` (in days) in `config.yaml` and let the plugin manage the TTL clause when it (re)creates the tables. To change retention on existing tables, alter them directly:

```sql
ALTER TABLE jaeger_index_local MODIFY TTL toDate(timestamp) + INTERVAL 90 DAY;
ALTER TABLE jaeger_spans_local MODIFY TTL toDate(timestamp) + INTERVAL 90 DAY;
```

## Summary

The `jaeger-clickhouse` gRPC storage plugin lets Jaeger v1 (≤1.57) write spans to ClickHouse, with the plugin auto-creating an indexed `jaeger_index_local` and a span-blob `jaeger_spans_local` table. ClickHouse's columnar storage makes span attribute filtering and trace reconstruction significantly faster and cheaper than Elasticsearch at high trace volumes, and you can query the tables directly for analysis beyond what the Jaeger UI supports. For new deployments, track the native ClickHouse backend landing in Jaeger v2 instead of building on the deprecated grpc-plugin API.
