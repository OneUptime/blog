# How to Build an OpenTelemetry + Kafka + ClickHouse Pipeline for Petabyte-Scale Trace Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kafka, ClickHouse, Distributed Tracing

Description: Learn how to build a production-grade pipeline combining OpenTelemetry, Kafka, and ClickHouse for storing and querying petabytes of trace data.

When your organization starts generating billions of spans per day, the typical approach of sending traces directly from the OpenTelemetry Collector to a storage backend falls apart. You need a buffer layer that can absorb traffic spikes, and you need a columnar database that can compress and query trace data efficiently. That is exactly what a Kafka + ClickHouse pipeline gives you.

## Architecture Overview

The pipeline has three stages:

1. **OpenTelemetry Collectors** running as agents on each node, exporting spans to Kafka.
2. **Apache Kafka** acting as a durable buffer and decoupling layer.
3. **ClickHouse** consuming from Kafka and storing traces in a columnar format optimized for analytical queries.

This separation means that if ClickHouse goes down for maintenance, you do not lose data. Kafka holds onto it until the consumer catches up.

## Setting Up the OpenTelemetry Collector with Kafka Exporter

First, configure the Collector to export traces to Kafka:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  kafka:
    # Kafka broker addresses
    brokers:
      - kafka-broker-1:9092
      - kafka-broker-2:9092
      - kafka-broker-3:9092
    topic: otel-traces
    protocol_version: "3.0.0"
    encoding: otlp_proto
    # Producer settings tuned for throughput
    producer:
      max_message_bytes: 10485760
      compression: zstd
      flush_max_messages: 500

processors:
  batch:
    send_batch_size: 8192
    send_batch_max_size: 16384
    timeout: 2s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [kafka]
```

The `zstd` compression is important here. It gives you excellent compression ratios with low CPU overhead, which matters when you are pushing millions of spans per second.

## Creating the ClickHouse Schema

ClickHouse needs a table that can handle the nested structure of OpenTelemetry spans. Here is a schema that works well at petabyte scale:

```sql
-- Create the traces table with proper partitioning
CREATE TABLE otel_traces (
    timestamp DateTime64(9) CODEC(Delta, ZSTD(1)),
    trace_id FixedString(32) CODEC(ZSTD(1)),
    span_id FixedString(16) CODEC(ZSTD(1)),
    parent_span_id FixedString(16) CODEC(ZSTD(1)),
    service_name LowCardinality(String) CODEC(ZSTD(1)),
    span_name LowCardinality(String) CODEC(ZSTD(1)),
    span_kind LowCardinality(String) CODEC(ZSTD(1)),
    duration_ns UInt64 CODEC(Delta, ZSTD(1)),
    status_code LowCardinality(String) CODEC(ZSTD(1)),
    -- Store attributes as a map for flexibility
    attributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    resource_attributes Map(LowCardinality(String), String) CODEC(ZSTD(1))
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (service_name, span_name, toUnixTimestamp(timestamp))
TTL toDate(timestamp) + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;
```

Key design decisions:

- **Partitioning by date** lets you drop old data cheaply with TTL.
- **LowCardinality** encoding on service names and span names dramatically reduces storage for repeated values.
- **Delta + ZSTD** on timestamps and durations exploits the fact that these values tend to be close together.

## Setting Up the Kafka-to-ClickHouse Consumer

You can use ClickHouse's built-in Kafka engine or run a separate consumer. The Kafka engine approach is simpler:

```sql
-- Create a Kafka engine table that reads from the topic
CREATE TABLE otel_traces_kafka (
    timestamp DateTime64(9),
    trace_id FixedString(32),
    span_id FixedString(16),
    parent_span_id FixedString(16),
    service_name String,
    span_name String,
    span_kind String,
    duration_ns UInt64,
    status_code String,
    attributes Map(String, String),
    resource_attributes Map(String, String)
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka-broker-1:9092,kafka-broker-2:9092',
    kafka_topic_list = 'otel-traces',
    kafka_group_name = 'clickhouse-traces-consumer',
    kafka_format = 'Protobuf',
    kafka_num_consumers = 8;

-- Materialized view to move data from Kafka engine to MergeTree
CREATE MATERIALIZED VIEW otel_traces_mv TO otel_traces AS
SELECT * FROM otel_traces_kafka;
```

## Scaling Considerations

At petabyte scale, keep these things in mind:

- **Kafka partitions**: Use at least 64 partitions for the traces topic. This lets multiple ClickHouse consumers read in parallel.
- **ClickHouse sharding**: Distribute data across a ClickHouse cluster using a `Distributed` table engine on top of the `MergeTree` tables.
- **Retention policies**: Set TTL on the ClickHouse table and configure Kafka topic retention separately. A common pattern is 48 hours of Kafka retention and 90 days of ClickHouse retention.

## Querying Traces

Once data is flowing, you can run analytical queries that would be slow in other databases:

```sql
-- Find the slowest services in the last hour
SELECT
    service_name,
    span_name,
    quantile(0.99)(duration_ns) / 1e6 as p99_ms,
    count() as span_count
FROM otel_traces
WHERE timestamp > now() - INTERVAL 1 HOUR
GROUP BY service_name, span_name
ORDER BY p99_ms DESC
LIMIT 20;
```

This query scans billions of rows in seconds thanks to ClickHouse's columnar storage and vectorized execution.

## Wrapping Up

The OpenTelemetry + Kafka + ClickHouse stack is one of the most cost-effective ways to handle trace storage at scale. Kafka gives you the durability and backpressure handling you need, and ClickHouse gives you the compression ratios and query performance that make petabyte-scale trace analysis practical. Start with a small cluster, measure your ingestion rate, and scale horizontally from there.
