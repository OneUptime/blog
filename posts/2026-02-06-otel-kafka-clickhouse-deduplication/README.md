# Use Real-Time Deduplication in OpenTelemetry Kafka-to-ClickHouse Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kafka, ClickHouse, Deduplication

Description: Implement real-time deduplication strategies for OpenTelemetry data flowing through Kafka into ClickHouse storage backends.

Duplicate telemetry data is a real problem. Collector retries, Kafka consumer rebalances, and network glitches can all cause the same span or metric to appear multiple times in your pipeline. At scale, duplicates waste storage, skew aggregations, and make troubleshooting harder. This post covers practical strategies for deduplicating OpenTelemetry data in a Kafka-to-ClickHouse pipeline.

## Where Duplicates Come From

Before we fix duplicates, let us understand where they originate:

1. **Collector retries**: If the Kafka exporter gets a timeout, it retries. The first attempt may have actually succeeded.
2. **Kafka consumer rebalances**: When a consumer group rebalances, some messages may be reprocessed.
3. **Application-level retries**: Your application's OTel SDK might retry failed exports.
4. **Multi-collector ingestion**: If traffic is load-balanced across multiple Collectors, retries from different Collectors can produce duplicates.

## Strategy 1: ClickHouse ReplacingMergeTree

The simplest deduplication approach uses ClickHouse's `ReplacingMergeTree` engine, which automatically removes duplicate rows during background merges:

```sql
-- Create table with ReplacingMergeTree for automatic dedup
CREATE TABLE otel_traces (
    Timestamp DateTime64(9) CODEC(Delta, ZSTD(1)),
    TraceId String CODEC(ZSTD(1)),
    SpanId String CODEC(ZSTD(1)),
    ParentSpanId String CODEC(ZSTD(1)),
    TraceState String CODEC(ZSTD(1)),
    SpanName LowCardinality(String) CODEC(ZSTD(1)),
    SpanKind LowCardinality(String) CODEC(ZSTD(1)),
    ServiceName LowCardinality(String) CODEC(ZSTD(1)),
    ResourceAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    ScopeName String CODEC(ZSTD(1)),
    ScopeVersion String CODEC(ZSTD(1)),
    SpanAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    Duration UInt64 CODEC(ZSTD(1)),
    StatusCode LowCardinality(String) CODEC(ZSTD(1)),
    StatusMessage String CODEC(ZSTD(1)),
    Events Nested (
        Timestamp DateTime64(9),
        Name LowCardinality(String),
        Attributes Map(LowCardinality(String), String)
    ) CODEC(ZSTD(1)),
    Links Nested (
        TraceId String,
        SpanId String,
        TraceState String,
        Attributes Map(LowCardinality(String), String)
    ) CODEC(ZSTD(1)),
    -- Version column for ReplacingMergeTree
    IngestedAt DateTime64(3) DEFAULT now64(3),
    INDEX idx_trace_id TraceId TYPE bloom_filter(0.001) GRANULARITY 1,
    INDEX idx_duration Duration TYPE minmax GRANULARITY 1
) ENGINE = ReplacingMergeTree(IngestedAt)
PARTITION BY toDate(Timestamp)
-- TraceId + SpanId is the natural unique key
ORDER BY (TraceId, SpanId);
```

The `ReplacingMergeTree` keeps only the row with the highest `IngestedAt` value for each unique combination of ORDER BY columns. Deduplication happens during background merges.

Important: `ReplacingMergeTree` does not deduplicate at query time by default. Use the `FINAL` modifier for exact results:

```sql
-- Exact count (slower, applies dedup at query time)
SELECT count() FROM otel_traces FINAL
WHERE Timestamp > now() - INTERVAL 1 HOUR;

-- Approximate count (faster, may include some duplicates)
SELECT count() FROM otel_traces
WHERE Timestamp > now() - INTERVAL 1 HOUR;
```

## Strategy 2: Kafka-Side Deduplication with a Bloom Filter

For real-time dedup before data reaches ClickHouse, use a Bloom filter in a consumer application. This example assumes the Kafka topic contains OTLP JSON payloads and forwards individual deduped spans to a JSON topic. If your downstream consumer expects full OTLP payloads or `otlp_proto`, preserve the resource/scope structure and decode and re-encode OTLP Protobuf instead of using `json.loads` and `json.dumps`.

```python
# kafka_dedup_consumer.py

from pybloom_live import ScalableBloomFilter
from kafka import KafkaConsumer, KafkaProducer
import json

# Bloom filter with 0.01% false positive rate
bloom = ScalableBloomFilter(
    initial_capacity=10_000_000,
    error_rate=0.0001,
    mode=ScalableBloomFilter.LARGE_SET_GROWTH
)

consumer = KafkaConsumer(
    "otel-traces-raw",
    bootstrap_servers=["kafka:9092"],
    group_id="dedup-processor",
    auto_offset_reset="earliest",
    value_deserializer=lambda m: json.loads(m.decode("utf-8"))
)

producer = KafkaProducer(
    bootstrap_servers=["kafka:9092"],
    value_serializer=lambda m: json.dumps(m).encode("utf-8"),
    compression_type="zstd"
)

for message in consumer:
    data = message.value
    for resource_span in data.get("resourceSpans", []):
        for scope_span in resource_span.get("scopeSpans", []):
            for span in scope_span.get("spans", []):
                # Create a unique key from trace_id + span_id
                dedup_key = f"{span['traceId']}:{span['spanId']}"

                if dedup_key not in bloom:
                    # First time seeing this span, forward it
                    bloom.add(dedup_key)
                    producer.send(
                        "otel-traces-deduped",
                        value=span,
                        key=span["traceId"].encode()
                    )
                # else: skip duplicate

    consumer.commit()
```

## Strategy 3: Collector-Level Dedup Keys

The OpenTelemetry Collector's stock processors do not provide stateful span deduplication. You can still add a deterministic dedup key with the transform processor, then use a custom processor, exporter, or downstream store to enforce uniqueness:

```yaml
# collector-with-dedup.yaml
receivers:
  kafka:
    brokers: ["kafka:9092"]
    topic: otel-traces-raw
    encoding: otlp_proto
    group_id: dedup-collector

processors:
  batch:
    send_batch_size: 4096
    timeout: 2s

  # Use transform processor to add dedup keys
  transform:
    error_mode: ignore
    trace_statements:
      - context: span
        statements:
          # Create a dedup key attribute
          - set(attributes["dedup_key"],
              Concat([trace_id.string, span_id.string], ":"))

exporters:
  clickhouse:
    endpoint: tcp://clickhouse:9000
    database: default
    traces_table_name: otel_traces
    create_schema: false

service:
  pipelines:
    traces:
      receivers: [kafka]
      processors: [transform, batch]
      exporters: [clickhouse]
```

## Strategy 4: ClickHouse Materialized View Block Dedup

Use a staging table with a materialized view to collapse duplicates within each inserted block before inserting into the final table. ClickHouse materialized view aggregation is applied to each inserted block, so duplicates that arrive in different insert batches still need a target engine such as `ReplacingMergeTree` or query-time `FINAL`:

```sql
-- Staging table (receives raw data including duplicates)
CREATE TABLE otel_traces_staging (
    Timestamp DateTime64(9),
    TraceId String,
    SpanId String,
    ServiceName String,
    SpanName String,
    Duration UInt64
) ENGINE = Null;

-- Deduplication using argMax in a materialized view
CREATE MATERIALIZED VIEW otel_traces_dedup_mv
TO otel_traces
AS SELECT
    argMax(Timestamp, Timestamp) as Timestamp,
    TraceId,
    SpanId,
    argMax(ServiceName, Timestamp) as ServiceName,
    argMax(SpanName, Timestamp) as SpanName,
    argMax(Duration, Timestamp) as Duration
FROM otel_traces_staging
GROUP BY TraceId, SpanId;
```

## Choosing the Right Strategy

- **Low effort**: Use `ReplacingMergeTree` with `FINAL` queries. Some duplicates persist between merges.
- **Real-time filtering**: Use the Bloom filter approach in a Kafka consumer, keeping in mind that Bloom filters can have false positives and in-memory filters lose state on restart.
- **Best of both**: Combine the Bloom filter for hot dedup with `ReplacingMergeTree` for eventual consistency.

## Wrapping Up

Deduplication is not optional in production telemetry pipelines. Choose the strategy that matches your accuracy requirements and operational budget. For most teams, starting with `ReplacingMergeTree` in ClickHouse is the simplest path, and you can layer on Kafka-side dedup later if you need stronger guarantees.
