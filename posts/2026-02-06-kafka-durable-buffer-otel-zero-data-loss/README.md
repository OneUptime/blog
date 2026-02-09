# How to Use Kafka as a Durable Buffer Between OpenTelemetry Collector Tiers for Zero Data Loss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kafka, Data Durability, Pipeline Architecture

Description: Use Apache Kafka as a durable buffer between OpenTelemetry Collector tiers to guarantee zero telemetry data loss during outages.

The OpenTelemetry Collector's built-in queues are good for handling short bursts and brief backend outages. But if your backend goes down for hours, or you need to reprocess telemetry data, in-process queues fall short. Kafka solves this by acting as a durable, replayable buffer between your edge Collectors and your backend-facing Collectors. This post shows how to set it up.

## Why Kafka Between Collector Tiers

A tiered Collector architecture typically has edge Collectors (agents on each node) sending data to gateway Collectors that export to backends. Inserting Kafka between these tiers gives you:

- Hours or days of buffering instead of minutes
- Replay capability for reprocessing data
- Decoupling of collection speed from backend ingestion speed
- Multiple consumers reading the same telemetry stream

## Architecture

The data flow looks like this: Application sends to Edge Collector, then Edge Collector produces to Kafka, then Gateway Collector consumes from Kafka, and finally Gateway Collector exports to Backend. Kafka sits in the middle as a persistent, distributed commit log.

## Edge Collector Configuration

The edge Collector receives OTLP data from applications and produces it to Kafka topics.

```yaml
# otel-collector-edge.yaml
# Edge collector that produces telemetry to Kafka

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Add node-level metadata
  resource:
    attributes:
      - key: collector.tier
        value: "edge"
        action: insert

  batch:
    send_batch_size: 500
    timeout: 2s

  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  # Produce traces to Kafka
  kafka/traces:
    protocol_version: 3.5.0
    brokers:
      - kafka-0.kafka.svc:9092
      - kafka-1.kafka.svc:9092
      - kafka-2.kafka.svc:9092
    topic: otel-traces
    encoding: otlp_proto
    # Producer config tuned for durability
    producer:
      # Wait for all in-sync replicas to acknowledge
      required_acks: -1
      # Compress to reduce broker storage and network usage
      compression: zstd
      # Flush at most every 100ms for low latency
      flush_max_messages: 500
      max_message_bytes: 10485760

  # Produce logs to a separate topic
  kafka/logs:
    protocol_version: 3.5.0
    brokers:
      - kafka-0.kafka.svc:9092
      - kafka-1.kafka.svc:9092
      - kafka-2.kafka.svc:9092
    topic: otel-logs
    encoding: otlp_proto
    producer:
      required_acks: -1
      compression: zstd

  # Produce metrics to a separate topic
  kafka/metrics:
    protocol_version: 3.5.0
    brokers:
      - kafka-0.kafka.svc:9092
      - kafka-1.kafka.svc:9092
      - kafka-2.kafka.svc:9092
    topic: otel-metrics
    encoding: otlp_proto
    producer:
      required_acks: -1
      compression: zstd

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [kafka/traces]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [kafka/logs]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [kafka/metrics]
```

## Kafka Topic Configuration

Create the Kafka topics with replication and retention settings that match your durability requirements.

```bash
#!/bin/bash
# create_kafka_topics.sh
# Creates Kafka topics for OTel telemetry with durability settings

KAFKA_BOOTSTRAP="kafka-0.kafka.svc:9092"

# Create traces topic
# - 12 partitions for parallelism across gateway collectors
# - Replication factor 3 for durability
# - 24 hours retention as a buffer window
kafka-topics.sh --create \
  --bootstrap-server "$KAFKA_BOOTSTRAP" \
  --topic otel-traces \
  --partitions 12 \
  --replication-factor 3 \
  --config retention.ms=86400000 \
  --config min.insync.replicas=2 \
  --config cleanup.policy=delete \
  --config compression.type=zstd \
  --config max.message.bytes=10485760

# Create logs topic with longer retention since logs are often larger
kafka-topics.sh --create \
  --bootstrap-server "$KAFKA_BOOTSTRAP" \
  --topic otel-logs \
  --partitions 12 \
  --replication-factor 3 \
  --config retention.ms=172800000 \
  --config min.insync.replicas=2 \
  --config cleanup.policy=delete \
  --config compression.type=zstd

# Create metrics topic
kafka-topics.sh --create \
  --bootstrap-server "$KAFKA_BOOTSTRAP" \
  --topic otel-metrics \
  --partitions 12 \
  --replication-factor 3 \
  --config retention.ms=86400000 \
  --config min.insync.replicas=2 \
  --config cleanup.policy=delete \
  --config compression.type=zstd

echo "Kafka topics created successfully."
```

## Gateway Collector Configuration

The gateway Collector consumes from Kafka and exports to your telemetry backends.

```yaml
# otel-collector-gateway.yaml
# Gateway collector that consumes from Kafka and exports to backends

receivers:
  # Consume traces from Kafka
  kafka/traces:
    protocol_version: 3.5.0
    brokers:
      - kafka-0.kafka.svc:9092
      - kafka-1.kafka.svc:9092
      - kafka-2.kafka.svc:9092
    topic: otel-traces
    encoding: otlp_proto
    # Consumer group ID - all gateway collectors share the same group
    # so partitions are distributed across them
    group_id: otel-gateway-traces
    # Start from earliest unprocessed message on first join
    initial_offset: earliest
    # Commit offsets only after successful export
    auto_commit:
      enable: true
      interval: 5s

  kafka/logs:
    protocol_version: 3.5.0
    brokers:
      - kafka-0.kafka.svc:9092
      - kafka-1.kafka.svc:9092
      - kafka-2.kafka.svc:9092
    topic: otel-logs
    encoding: otlp_proto
    group_id: otel-gateway-logs
    initial_offset: earliest

  kafka/metrics:
    protocol_version: 3.5.0
    brokers:
      - kafka-0.kafka.svc:9092
      - kafka-1.kafka.svc:9092
      - kafka-2.kafka.svc:9092
    topic: otel-metrics
    encoding: otlp_proto
    group_id: otel-gateway-metrics
    initial_offset: earliest

processors:
  batch:
    send_batch_size: 1024
    timeout: 10s

exporters:
  otlp/tempo:
    endpoint: tempo.monitoring.svc:4317
    retry_on_failure:
      enabled: true
      max_elapsed_time: 300s

  otlp/loki:
    endpoint: loki.monitoring.svc:3100
    retry_on_failure:
      enabled: true

  prometheusremotewrite:
    endpoint: http://prometheus.monitoring.svc:9090/api/v1/write
    retry_on_failure:
      enabled: true

service:
  pipelines:
    traces:
      receivers: [kafka/traces]
      processors: [batch]
      exporters: [otlp/tempo]
    logs:
      receivers: [kafka/logs]
      processors: [batch]
      exporters: [otlp/loki]
    metrics:
      receivers: [kafka/metrics]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

## Monitoring Kafka Consumer Lag

Consumer lag tells you how far behind your gateway Collectors are. A growing lag means your backends cannot keep up with ingestion.

```yaml
# kafka-monitoring-alerts.yaml
# Alerts for Kafka consumer lag in the OTel pipeline
groups:
  - name: otel-kafka-pipeline
    rules:
      # Alert when consumer lag exceeds 10,000 messages
      - alert: OTelKafkaConsumerLagHigh
        expr: kafka_consumer_group_lag{group=~"otel-gateway.*"} > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Kafka consumer lag for {{ $labels.group }} on {{ $labels.topic }}: {{ $value }}"

      # Alert when consumer lag is growing consistently
      - alert: OTelKafkaConsumerLagGrowing
        expr: deriv(kafka_consumer_group_lag{group=~"otel-gateway.*"}[10m]) > 100
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Consumer lag is growing for {{ $labels.group }}, backends may be unable to keep up"
```

## Replaying Data After an Incident

One of Kafka's best features for telemetry is replay. If your backend had a bug that corrupted data, you can reset the consumer offset and reprocess.

```bash
#!/bin/bash
# replay_telemetry.sh
# Reset consumer group offset to replay telemetry data from a specific time

KAFKA_BOOTSTRAP="kafka-0.kafka.svc:9092"
GROUP="otel-gateway-traces"
TOPIC="otel-traces"
REPLAY_FROM="2026-02-05T10:00:00.000"

# First, stop the gateway collectors to prevent offset conflicts
kubectl scale deployment otel-collector-gateway -n monitoring --replicas=0
sleep 10

# Reset the consumer group offset to the desired timestamp
kafka-consumer-groups.sh \
  --bootstrap-server "$KAFKA_BOOTSTRAP" \
  --group "$GROUP" \
  --topic "$TOPIC" \
  --reset-offsets \
  --to-datetime "$REPLAY_FROM" \
  --execute

echo "Offsets reset to $REPLAY_FROM"
echo "Restarting gateway collectors..."

# Restart the gateway collectors to begin replaying
kubectl scale deployment otel-collector-gateway -n monitoring --replicas=4

echo "Replay started. Monitor consumer lag to track progress."
```

## Summary

Kafka between OTel Collector tiers gives you the durability guarantees that built-in queues cannot match. With 24-hour retention on Kafka topics, replication factor 3, and min.insync.replicas set to 2, you can survive extended backend outages without losing a single span or log record. The trade-off is operational complexity - you now have a Kafka cluster to manage. But for teams that already run Kafka or need guaranteed zero data loss, this architecture is well worth it.
