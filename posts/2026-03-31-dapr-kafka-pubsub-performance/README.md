# How to Configure Apache Kafka for Optimal Dapr Pub/Sub Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kafka, Pub/Sub, Performance, Partition

Description: Tune Apache Kafka configuration for optimal Dapr pub/sub performance by setting correct partition counts, consumer group settings, and Dapr component metadata.

---

Apache Kafka is a high-throughput pub/sub broker well-suited for Dapr workloads that require durable message delivery and horizontal scaling. Getting optimal performance requires configuring both the Kafka broker and the Dapr Kafka component correctly.

## Dapr Kafka Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka-broker-0.kafka.default.svc.cluster.local:9092,kafka-broker-1.kafka.default.svc.cluster.local:9092,kafka-broker-2.kafka.default.svc.cluster.local:9092"
  - name: authType
    value: "none"
  - name: initialOffset
    value: "oldest"
  - name: consumeRetryInterval
    value: "200ms"
  - name: heartbeatInterval
    value: "3000ms"
  - name: sessionTimeout
    value: "90000ms"
  - name: maxMessageBytes
    value: "1048576"
  - name: version
    value: "3.3.0"
```

## Partition Configuration for Throughput

Topic partitions directly control parallelism. Create topics with enough partitions for your consumer count:

```bash
# Create a topic with 12 partitions (rule of thumb: 2-3x your consumer replicas)
kafka-topics.sh \
  --bootstrap-server kafka:9092 \
  --create \
  --topic orders \
  --partitions 12 \
  --replication-factor 3

# Check topic details
kafka-topics.sh \
  --bootstrap-server kafka:9092 \
  --describe \
  --topic orders
```

## Consumer Group Parallelism

Dapr assigns each app instance to a consumer group. Scale replicas to match partition count:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
spec:
  replicas: 6  # Half of 12 partitions - each replica handles 2 partitions
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-processor"
        dapr.io/app-port: "8080"
```

## Kafka Producer Performance Tuning

Configure the Dapr component for high-throughput publishing:

```yaml
  - name: maxMessageBytes
    value: "1000000"
  - name: consumerFetchMin
    value: "1"
  - name: compression
    value: "snappy"
```

The `maxMessageBytes` field controls the maximum message size for both producers and consumers. The `consumerFetchMin` field sets the minimum number of bytes the broker waits for before responding to a fetch request, which can improve throughput by batching. The `compression` field accepts `none`, `gzip`, `snappy`, `lz4`, or `zstd`.

## Monitoring Kafka Consumer Lag

Track consumer lag to detect processing bottlenecks:

```bash
# Check consumer group lag
kafka-consumer-groups.sh \
  --bootstrap-server kafka:9092 \
  --describe \
  --group order-processor

# Output shows LAG per partition:
# TOPIC     PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# orders    0          1234            1234            0
# orders    1          1100            1200            100  <- lag!
```

Alert when lag exceeds your SLO threshold using a Prometheus rule:

```yaml
- alert: KafkaDaprConsumerLag
  expr: |
    kafka_consumer_group_lag{
      topic="orders",
      consumergroup="order-processor"
    } > 1000
  for: 5m
  labels:
    severity: warning
```

## Compression for Large Messages

Enable compression to reduce network overhead:

```yaml
  - name: compression
    value: "snappy"
```

Snappy provides a good balance between compression ratio and CPU overhead. Use `gzip` for better compression when CPU is not a bottleneck.

## Summary

Optimal Dapr Kafka pub/sub performance requires matching topic partition counts to consumer replica counts, configuring appropriate ack wait times based on durability requirements, and enabling message compression for high-throughput scenarios. Monitor consumer lag per partition to detect imbalances and scale consumer replicas when lag consistently increases.
