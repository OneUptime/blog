# How to Use the Kafka Exporter and Kafka Receiver in the Collector for Buffered Telemetry Delivery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kafka, Collector, Telemetry Pipelines

Description: A practical guide to configuring the Kafka exporter and Kafka receiver in the OpenTelemetry Collector for reliable buffered delivery.

The OpenTelemetry Collector ships with both a Kafka exporter and a Kafka receiver. Together, they let you build a two-stage pipeline where one Collector pushes telemetry into Kafka and another Collector pulls it out. This decoupling gives you durability, backpressure handling, and the ability to fan out data to multiple consumers.

## Why Buffer Through Kafka?

Direct Collector-to-backend pipelines have a problem: if the backend goes down or gets slow, the Collector either drops data or backs up and eventually OOMs. Kafka sits in the middle and absorbs the shock. Your producing Collectors can keep running at full speed, and your consuming Collectors pull at whatever pace the backend can handle.

## Configuring the Kafka Exporter

The Kafka exporter lives in the `opentelemetry-collector-contrib` distribution. Here is a configuration that exports all three signal types to separate Kafka topics:

```yaml
# producer-collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  kafka/traces:
    brokers:
      - kafka-1:9092
      - kafka-2:9092
    topic: otel-traces
    protocol_version: "3.0.0"
    encoding: otlp_proto
    producer:
      compression: snappy
      # Wait up to 10ms to batch messages together
      flush_max_messages: 1000

  kafka/metrics:
    brokers:
      - kafka-1:9092
      - kafka-2:9092
    topic: otel-metrics
    protocol_version: "3.0.0"
    encoding: otlp_proto
    producer:
      compression: snappy

  kafka/logs:
    brokers:
      - kafka-1:9092
      - kafka-2:9092
    topic: otel-logs
    protocol_version: "3.0.0"
    encoding: otlp_proto
    producer:
      compression: snappy

processors:
  batch:
    send_batch_size: 4096
    timeout: 1s

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

Using separate topics per signal type keeps things clean. You can set different retention policies, partition counts, and consumer groups for each signal.

## Configuring the Kafka Receiver

On the consuming side, another Collector reads from Kafka and forwards to your backend:

```yaml
# consumer-collector.yaml
receivers:
  kafka/traces:
    brokers:
      - kafka-1:9092
      - kafka-2:9092
    topic: otel-traces
    protocol_version: "3.0.0"
    encoding: otlp_proto
    group_id: otel-consumer-traces
    # Start from the earliest unread offset
    initial_offset: earliest
    # Number of parallel consumers within this Collector
    session_timeout: 30s

  kafka/metrics:
    brokers:
      - kafka-1:9092
      - kafka-2:9092
    topic: otel-metrics
    protocol_version: "3.0.0"
    encoding: otlp_proto
    group_id: otel-consumer-metrics
    initial_offset: earliest

  kafka/logs:
    brokers:
      - kafka-1:9092
      - kafka-2:9092
    topic: otel-logs
    protocol_version: "3.0.0"
    encoding: otlp_proto
    group_id: otel-consumer-logs
    initial_offset: earliest

exporters:
  otlphttp:
    endpoint: https://your-backend.example.com:4318

processors:
  batch:
    send_batch_size: 8192
    timeout: 2s

service:
  pipelines:
    traces:
      receivers: [kafka/traces]
      processors: [batch]
      exporters: [otlphttp]
    metrics:
      receivers: [kafka/metrics]
      processors: [batch]
      exporters: [otlphttp]
    logs:
      receivers: [kafka/logs]
      processors: [batch]
      exporters: [otlphttp]
```

## Authentication and TLS

In production, you will want to secure the Kafka connection. Here is how to add SASL/SCRAM authentication:

```yaml
exporters:
  kafka/traces:
    brokers:
      - kafka-1:9093
    topic: otel-traces
    protocol_version: "3.0.0"
    encoding: otlp_proto
    auth:
      sasl:
        mechanism: SCRAM-SHA-512
        username: ${env:KAFKA_USERNAME}
        password: ${env:KAFKA_PASSWORD}
      tls:
        ca_file: /etc/ssl/certs/kafka-ca.pem
        cert_file: /etc/ssl/certs/collector-cert.pem
        key_file: /etc/ssl/certs/collector-key.pem
```

## Encoding Options

The `encoding` field supports several formats:

- `otlp_proto` - Native OTLP protobuf. Best for Collector-to-Collector pipelines.
- `otlp_json` - JSON encoding. Useful when non-OTel consumers need to read the data.
- `jaeger` - Jaeger format for traces. Use this if you have existing Jaeger consumers.
- `zipkin` - Zipkin format for traces.

Stick with `otlp_proto` unless you have a specific reason to use something else. It is the most compact and preserves all the original data without any lossy conversion.

## Scaling the Consumer Side

One nice property of Kafka-based delivery is that you can scale consumers horizontally. Run multiple instances of the consumer Collector with the same `group_id`, and Kafka will distribute partitions across them:

```bash
# Run 4 consumer Collector instances
# Kafka will assign partitions to each one automatically
for i in 1 2 3 4; do
  otelcol-contrib --config consumer-collector.yaml &
done
```

Make sure your Kafka topic has at least as many partitions as consumer instances, or some consumers will sit idle.

## Monitoring the Pipeline

Add the Collector's own metrics to track lag:

```yaml
service:
  telemetry:
    metrics:
      level: detailed
      address: 0.0.0.0:8888
```

Watch the `kafka_receiver_partition_lag` metric to see if consumers are keeping up. If lag grows consistently, add more consumer instances or increase the batch size in the exporter.

## Wrapping Up

The Kafka exporter and receiver turn the OpenTelemetry Collector into a two-phase pipeline with a durable buffer in the middle. This is one of the simplest and most effective patterns for making telemetry delivery reliable at scale. Start with a single Kafka topic and one consumer, then grow from there as your volume increases.
