# How to Choose the Right Pub/Sub Broker for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Kafka, RabbitMQ, Redis, Azure Service Bus, Architecture, Microservice

Description: Compare Dapr-supported pub/sub brokers across throughput, latency, ordering, and operational complexity to choose the best fit for your use case.

---

## Overview

Dapr supports over 20 pub/sub brokers through a unified API. Because Dapr abstracts broker-specific code, switching brokers requires only a component YAML change. However, choosing the right broker upfront still matters for performance, cost, and operational complexity. This guide compares the most popular Dapr pub/sub brokers.

## Key Criteria for Selection

1. **Throughput**: Messages per second at target latency
2. **Ordering**: Whether message order is guaranteed
3. **Persistence**: Whether messages survive broker restarts
4. **Retention**: How long messages are stored after consumption
5. **Operational complexity**: Infrastructure burden
6. **Cloud managed**: Whether a fully managed version exists

## Broker Comparison

| Broker | Throughput | Ordering | Retention | Managed Option |
|---|---|---|---|---|
| Kafka | Very high | Per partition | Days/weeks | Confluent Cloud, MSK |
| RabbitMQ | High | Per queue | Until consumed | CloudAMQP |
| Redis Streams | Medium | Per stream | Configurable | Redis Cloud, ElastiCache |
| Azure Service Bus | Medium | Per session | Up to 14 days (Basic) / unlimited (Standard+) | Fully managed |
| Azure Event Hubs | Very high | Per partition | Up to 90 days | Fully managed |
| AWS SNS/SQS | High | Per FIFO queue | Up to 14 days | Fully managed |
| GCP Pub/Sub | Very high | Per ordering key | Up to 31 days | Fully managed |
| In-Memory | N/A | FIFO | None | N/A |

## When to Choose Kafka

Use Kafka when you need:
- Very high throughput (millions of messages/second)
- Long message retention for replay
- Ordered processing within a customer/entity

```yaml
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka:9092"
    - name: consumerGroup
      value: "my-service"
```

## When to Choose RabbitMQ

Use RabbitMQ when you need:
- Complex routing with exchanges and bindings
- Immediate message delivery with low latency
- Simpler operations than Kafka

```yaml
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
    - name: connectionString
      value: "amqp://rabbitmq:5672"
    - name: durable
      value: "true"
```

## When to Choose Redis Streams

Use Redis when you need:
- Low infrastructure overhead
- Already running Redis for caching
- Moderate throughput (tens of thousands/second)

```yaml
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
```

## When to Choose a Cloud Managed Broker

For cloud-native applications, managed services eliminate operational burden:

```yaml
# Azure Service Bus - great for enterprise workflows with DLQ and sessions
spec:
  type: pubsub.azure.servicebus.topics
  version: v1

# AWS SNS/SQS - native AWS integration with IAM and FIFO support
spec:
  type: pubsub.aws.snssqs
  version: v1

# GCP Pub/Sub - excellent for GCP-native workloads
spec:
  type: pubsub.gcp.pubsub
  version: v1
```

## Decision Flowchart

```text
Are you on a specific cloud? --> YES --> Use that cloud's managed broker
          |
          NO
          v
Do you need >1M msgs/sec? --> YES --> Kafka
          |
          NO
          v
Do you already run Redis? --> YES --> Redis Streams
          |
          NO
          v
Do you need complex routing? --> YES --> RabbitMQ
          |
          NO
          v
Is this for development only? --> YES --> In-Memory
```

## Summary

Dapr's abstraction lets you start with In-Memory for development and switch to a production broker by changing one YAML file. For most teams on a cloud provider, start with the managed broker native to your cloud. For high-throughput streaming or event sourcing, use Kafka. For lower-complexity workloads already using Redis, Redis Streams is the lowest-friction choice.
