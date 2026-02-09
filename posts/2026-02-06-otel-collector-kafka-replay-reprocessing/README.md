# How to Configure OpenTelemetry Collector to Export Telemetry to Apache Kafka for Replay and Reprocessing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kafka, Data Replay, Telemetry Reprocessing

Description: Configure the OpenTelemetry Collector to export telemetry into Kafka topics for data replay, reprocessing, and audit trails.

One of the most underappreciated benefits of putting Kafka into your telemetry pipeline is the ability to replay data. Made a mistake in your processing logic? Replay the last 48 hours from Kafka. Want to backfill a new dashboard? Replay the relevant topic. This post shows you how to configure the Collector for replay-friendly Kafka export.

## The Replay Pattern

The idea is simple: Kafka retains messages for a configurable period. If you set retention to 7 days and your processing pipeline has a bug, you can fix the bug and reprocess all 7 days of data by resetting the consumer group offset to the beginning.

## Collector Configuration for Replay-Friendly Export

The key settings that make replay possible are retention, encoding format, and partitioning:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  # Primary export to Kafka for processing
  kafka/traces:
    brokers:
      - kafka-1:9092
      - kafka-2:9092
      - kafka-3:9092
    topic: otel-traces-replayable
    protocol_version: "3.0.0"
    # Use JSON for human readability during debugging
    encoding: otlp_json
    producer:
      compression: zstd
      # Ensure ordering within a trace
      max_message_bytes: 10485760
      required_acks: all
    # Partition by trace_id to keep related spans together
    partition_traces_by_id: true

  kafka/metrics:
    brokers:
      - kafka-1:9092
      - kafka-2:9092
      - kafka-3:9092
    topic: otel-metrics-replayable
    protocol_version: "3.0.0"
    encoding: otlp_json
    producer:
      compression: zstd
      required_acks: all

  kafka/logs:
    brokers:
      - kafka-1:9092
      - kafka-2:9092
      - kafka-3:9092
    topic: otel-logs-replayable
    protocol_version: "3.0.0"
    encoding: otlp_json
    producer:
      compression: zstd
      required_acks: all

processors:
  batch:
    send_batch_size: 4096
    timeout: 2s

  # Add timestamps as Kafka headers for easier replay filtering
  attributes:
    actions:
      - key: collector.export_timestamp
        value: ""
        action: upsert

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [kafka/traces]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [kafka/metrics]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [kafka/logs]
```

## Kafka Topic Configuration for Replay

Configure the Kafka topics with extended retention:

```bash
# Create topics with 7-day retention and enough partitions for parallel replay
kafka-topics.sh --create \
  --bootstrap-server kafka-1:9092 \
  --topic otel-traces-replayable \
  --partitions 64 \
  --replication-factor 3 \
  --config retention.ms=604800000 \
  --config retention.bytes=-1 \
  --config cleanup.policy=delete \
  --config compression.type=zstd \
  --config segment.bytes=1073741824

kafka-topics.sh --create \
  --bootstrap-server kafka-1:9092 \
  --topic otel-metrics-replayable \
  --partitions 32 \
  --replication-factor 3 \
  --config retention.ms=604800000

kafka-topics.sh --create \
  --bootstrap-server kafka-1:9092 \
  --topic otel-logs-replayable \
  --partitions 32 \
  --replication-factor 3 \
  --config retention.ms=604800000
```

## Replaying Data

When you need to reprocess data, create a new consumer group and reset its offset:

```bash
# Reset the consumer group to replay from a specific timestamp
kafka-consumer-groups.sh \
  --bootstrap-server kafka-1:9092 \
  --group replay-processor-v2 \
  --topic otel-traces-replayable \
  --reset-offsets \
  --to-datetime 2026-02-01T00:00:00.000 \
  --execute

# Or replay everything from the beginning
kafka-consumer-groups.sh \
  --bootstrap-server kafka-1:9092 \
  --group replay-processor-v2 \
  --topic otel-traces-replayable \
  --reset-offsets \
  --to-earliest \
  --execute
```

Then start your consumer Collector with the new group ID:

```yaml
# replay-consumer.yaml
receivers:
  kafka:
    brokers:
      - kafka-1:9092
    topic: otel-traces-replayable
    protocol_version: "3.0.0"
    encoding: otlp_json
    group_id: replay-processor-v2
    initial_offset: earliest

exporters:
  otlphttp:
    endpoint: https://new-backend.example.com:4318

processors:
  batch:
    send_batch_size: 8192
    timeout: 5s

service:
  pipelines:
    traces:
      receivers: [kafka]
      processors: [batch]
      exporters: [otlphttp]
```

## Selective Replay with Timestamp Filtering

If you only need to replay a specific time window, use the Collector's filter processor on the consuming side:

```yaml
processors:
  filter:
    traces:
      span:
        - 'start_time_unix_nano < 1706745600000000000'
        - 'start_time_unix_nano > 1706832000000000000'
```

This drops spans outside your target window, so you do not reprocess everything.

## Storage Cost Estimation

Before setting a long retention period, estimate your Kafka storage needs:

```
Daily span volume: 1 billion spans
Average span size (JSON + compression): ~200 bytes
Daily storage: 1B * 200B = 200 GB
7-day retention: 200 GB * 7 = 1.4 TB
With 3x replication: 1.4 TB * 3 = 4.2 TB
```

This is manageable for most organizations, and the ability to replay weeks of telemetry data is well worth the storage cost.

## Wrapping Up

Exporting telemetry to Kafka with extended retention transforms your observability pipeline from a fire-and-forget system into one that supports replay, reprocessing, and backfilling. The next time you need to migrate backends, fix a processing bug, or populate a new analytics table, you will be glad you have a week of raw telemetry sitting in Kafka waiting to be replayed.
