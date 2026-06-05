# How to Monitor Kafka Consumer Group Lag and Per-Topic Throughput

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kafka, Consumer Lag, Throughput

Description: Monitor Kafka consumer group lag and per-topic throughput using the OpenTelemetry Collector to detect slow consumers and throughput bottlenecks.

Consumer group lag is the difference between the latest message offset produced to a topic and the last offset committed by a consumer group. Growing lag means consumers are falling behind producers. Tracking lag per partition and per consumer group helps you identify which consumers need scaling or optimization.

## Collector Configuration with Kafka Metrics Receiver

The OpenTelemetry Collector contrib distribution includes a Kafka metrics receiver:

```yaml
receivers:
  kafka_metrics:
    # Kafka broker addresses
    brokers:
      - kafka-1:9092
    protocol_version: 2.8.0
    collection_interval: 15s
    # Scraper configurations
    scrapers:
      - topics
      - consumers

processors:
  batch:
    timeout: 10s
  resource:
    attributes:
      - key: service.name
        value: kafka
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [kafka_metrics]
      processors: [resource, batch]
      exporters: [otlp]
```

## Key Consumer Lag Metrics

```text
kafka.consumer_group.lag          - Offset lag per partition per consumer group
kafka.consumer_group.offset       - Current consumer group offset
kafka.consumer_group.members      - Number of members in the consumer group
```

### Calculating Total Lag

Total lag for a consumer group is the sum of lag across all assigned partitions:

```text
total_lag = sum(kafka.consumer_group.lag{group="my-consumer-group"})
```

### Lag Rate

The rate of lag change tells you if consumers are catching up or falling further behind:

```text
lag_rate = deriv(kafka.consumer_group.lag[5m])
```

A positive rate means lag is growing. A negative rate means consumers are catching up.

## Per-Topic Throughput Metrics

```text
kafka.topic.partitions           - Number of partitions per topic
kafka.partition.current_offset   - Latest offset per partition (high watermark)
kafka.partition.oldest_offset    - Earliest available offset per partition
```

### Calculate Production Rate

```text
production_rate = deriv(kafka.partition.current_offset[5m])
```

This tells you how many messages per second are being produced to each topic partition.

## Using JMX for Additional Consumer Metrics

For client-side consumer metrics, run the OpenTelemetry JMX Scraper as a standalone Java process and point it at the consumer application's JMX endpoint:

```properties
otel.jmx.service.url=service:jmx:rmi:///jndi/rmi://consumer-app:9999/jmxrmi
otel.jmx.target.system=kafka-consumer
otel.metric.export.interval=15s
otel.metrics.exporter=otlp
otel.exporter.otlp.endpoint=http://your-collector:4317
```

The built-in Kafka consumer JMX target includes:

```text
# Consumer fetch performance

kafka.consumer.fetch-rate                  - Fetch requests per second
kafka.consumer.total.records-consumed-rate - Records consumed per second across all topics
kafka.consumer.total.bytes-consumed-rate   - Bytes consumed per second across all topics
kafka.consumer.records-consumed-rate       - Records consumed per second by topic
kafka.consumer.bytes-consumed-rate         - Bytes consumed per second by topic

# Consumer lag (client-side view)
kafka.consumer.records-lag-max             - Maximum lag across all partitions

# Coordinator metrics exposed by Kafka JMX MBeans for custom mappings
commit-rate                                - Offset commit rate
join-rate                                  - Group rejoin rate (rebalancing indicator)
```

## Docker Compose Setup

```yaml
version: "3.8"

services:
  kafka-1:
    image: confluentinc/cp-kafka:7.6.10
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-1:9092
      KAFKA_JMX_PORT: 9999
      KAFKA_JMX_HOSTNAME: kafka-1

  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.10
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"
```

## Alert Conditions

```yaml
# Consumer lag growing
- alert: KafkaConsumerLagGrowing
  condition: deriv(kafka.consumer_group.lag{group="order-processor"}[10m]) > 100
  for: 10m
  severity: warning
  message: "Consumer group 'order-processor' lag is growing at {{ value }} messages/sec"

# Consumer lag too high
- alert: KafkaConsumerLagHigh
  condition: sum(kafka.consumer_group.lag{group="order-processor"}) > 100000
  for: 5m
  severity: critical
  message: "Consumer group 'order-processor' has {{ value }} messages of lag"

# Consumer group has no members
- alert: KafkaConsumerGroupEmpty
  condition: kafka.consumer_group.members == 0
  for: 5m
  severity: critical
  message: "Consumer group '{{ group }}' has no active members"

# Topic throughput dropped
- alert: KafkaTopicThroughputDrop
  condition: deriv(kafka.partition.current_offset{topic="orders"}[5m]) < 10
  for: 10m
  severity: warning
  message: "Topic 'orders' production rate dropped below 10 msgs/sec"
```

## Monitoring Consumer Rebalancing

Frequent consumer group rebalancing causes lag spikes. Track rebalancing through:

```text
join-rate  - How often the consumer joins the group
```

A high join rate indicates instability. Common causes: consumer crashes, session timeouts too aggressive, or long-running message processing that exceeds `max.poll.interval.ms`.

## Summary

Consumer group lag is the primary indicator of whether your Kafka consumers are keeping up with producers. The OpenTelemetry Collector's Kafka metrics receiver scrapes lag, offset, and topic metrics directly from Kafka brokers. Combine this with JMX metrics from consumer applications for a complete picture. Set alerts on lag growth rate, absolute lag thresholds, empty consumer groups, and throughput drops to catch issues before they become user-facing problems.
