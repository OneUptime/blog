# How to Monitor Kafka Consumer Group Lag and Per-Topic Throughput with the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kafka, Consumer Lag, Throughput

Description: Monitor Kafka consumer group lag and per-topic throughput using the OpenTelemetry Collector to detect slow consumers and throughput bottlenecks.

Consumer group lag is the difference between the latest message offset produced to a topic and the last offset committed by a consumer group. Growing lag means consumers are falling behind producers. Tracking lag per partition and per consumer group helps you identify which consumers need scaling or optimization.

## Collector Configuration with Kafka Metrics Receiver

The OpenTelemetry Collector contrib distribution includes a Kafka metrics receiver:

```yaml
receivers:
  kafkametrics:
    # Kafka broker addresses
    brokers:
      - kafka-1:9092
      - kafka-2:9092
      - kafka-3:9092
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
      receivers: [kafkametrics]
      processors: [resource, batch]
      exporters: [otlp]
```

## Key Consumer Lag Metrics

```
kafka.consumer_group.lag          - Offset lag per partition per consumer group
kafka.consumer_group.offset       - Current consumer group offset
kafka.consumer_group.members      - Number of members in the consumer group
```

### Calculating Total Lag

Total lag for a consumer group is the sum of lag across all assigned partitions:

```
total_lag = sum(kafka.consumer_group.lag{group="my-consumer-group"})
```

### Lag Rate

The rate of lag change tells you if consumers are catching up or falling further behind:

```
lag_rate = rate(kafka.consumer_group.lag[5m])
```

A positive rate means lag is growing. A negative rate means consumers are catching up.

## Per-Topic Throughput Metrics

```
kafka.topic.partitions           - Number of partitions per topic
kafka.partition.current_offset   - Latest offset per partition (high watermark)
kafka.partition.oldest_offset    - Earliest available offset per partition
```

### Calculate Production Rate

```
production_rate = rate(kafka.partition.current_offset[5m])
```

This tells you how many messages per second are being produced to each topic partition.

## Using JMX for Additional Consumer Metrics

For client-side consumer metrics, the JMX receiver can connect to consumer applications:

```yaml
receivers:
  jmx/consumer:
    jar_path: /opt/opentelemetry-jmx-metrics.jar
    endpoint: consumer-app:9999
    target_system: kafka-consumer
    collection_interval: 15s
```

Consumer JMX metrics include:

```
# Consumer fetch performance
kafka.consumer.fetch_rate              - Fetch requests per second
kafka.consumer.records_consumed_rate   - Records consumed per second
kafka.consumer.bytes_consumed_rate     - Bytes consumed per second

# Consumer lag (client-side view)
kafka.consumer.records_lag_max         - Maximum lag across all partitions
kafka.consumer.records_lag             - Per-partition lag

# Coordinator metrics
kafka.consumer.commit_rate             - Offset commit rate
kafka.consumer.join_rate               - Group rejoin rate (rebalancing indicator)
```

## Docker Compose Setup

```yaml
version: "3.8"

services:
  kafka-1:
    image: confluentinc/cp-kafka:latest
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-1:9092
      KAFKA_JMX_PORT: 9999

  zookeeper:
    image: confluentinc/cp-zookeeper:latest
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
  condition: rate(kafka.consumer_group.lag{group="order-processor"}[10m]) > 100
  for: 10m
  severity: warning
  message: "Consumer group 'order-processor' lag is growing at {{ value }} messages/min"

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
  condition: rate(kafka.partition.current_offset{topic="orders"}[5m]) < 10
  for: 10m
  severity: warning
  message: "Topic 'orders' production rate dropped below 10 msgs/sec"
```

## Monitoring Consumer Rebalancing

Frequent consumer group rebalancing causes lag spikes. Track rebalancing through:

```
kafka.consumer.join_rate  - How often the consumer joins the group
```

A high join rate indicates instability. Common causes: consumer crashes, session timeouts too aggressive, or long-running message processing that exceeds `max.poll.interval.ms`.

## Summary

Consumer group lag is the primary indicator of whether your Kafka consumers are keeping up with producers. The OpenTelemetry Collector's Kafka metrics receiver scrapes lag, offset, and topic metrics directly from Kafka brokers. Combine this with JMX metrics from consumer applications for a complete picture. Set alerts on lag growth rate, absolute lag thresholds, empty consumer groups, and throughput drops to catch issues before they become user-facing problems.
