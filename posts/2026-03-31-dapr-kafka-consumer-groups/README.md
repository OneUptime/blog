# How to Tune Kafka Consumer Groups for Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kafka, Consumer Group, Pub/Sub, Performance, Tuning, Microservice

Description: Tune Kafka consumer group settings in Dapr pub/sub for optimal throughput, partition assignment, and lag management in production deployments.

---

## Overview

Kafka consumer groups allow multiple instances of a service to consume messages in parallel. When using Dapr with Kafka pub/sub, understanding how Dapr maps consumer groups to Kafka concepts is critical for achieving desired throughput and avoiding rebalancing issues. This guide covers key tuning parameters and strategies.

## How Dapr Uses Kafka Consumer Groups

Dapr uses the `consumerGroup` metadata field as the Kafka consumer group ID. All instances of the same Dapr application (same `app-id`) share one consumer group. Kafka assigns partitions to active consumers within the group, so scaling your service adds parallel consumers.

## Dapr Component Configuration

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
      value: "kafka-0.kafka.default.svc.cluster.local:9092"
    - name: consumerGroup
      value: "order-processor"
    - name: authType
      value: "none"
    - name: maxMessageBytes
      value: "1048576"
    - name: consumeRetryInterval
      value: "200ms"
    - name: initialOffset
      value: "newest"
```

## Key Tuning Parameters

### Session Timeout and Heartbeat

Configure via Kafka broker and component settings to prevent unnecessary rebalancing:

```yaml
metadata:
  - name: sessionTimeout
    value: "10s"
  - name: heartbeatInterval
    value: "3s"
```

The heartbeat interval should be one-third of the session timeout. If your processing takes longer than the session timeout, Kafka will trigger a rebalance.

## Scaling Consumers

To scale consumption, increase the number of Dapr sidecar replicas:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
spec:
  replicas: 4
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-processor"
        dapr.io/app-port: "5000"
    spec:
      containers:
        - name: app
          image: order-processor:latest
```

The Dapr sidecar injector automatically adds the sidecar container to pods with the `dapr.io/enabled: "true"` annotation. You do not need to declare the sidecar container manually.

Kafka will distribute partitions across up to `N` replicas, where `N` equals the partition count on the topic.

## Monitoring Consumer Lag

```bash
# Check consumer group lag
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --group order-processor

# Output shows CURRENT-OFFSET, LOG-END-OFFSET, and LAG per partition
```

## Rebalancing Strategies

Dapr exposes the `consumerGroupRebalanceStrategy` metadata field to control how partitions are assigned across consumers. The supported strategies are `range` (default), `sticky`, and `roundrobin`:

```yaml
metadata:
  - name: consumerGroupRebalanceStrategy
    value: "sticky"
```

Using `sticky` reduces partition movement during rebalances by attempting to keep existing partition assignments intact.

## Processing Failures

When Dapr encounters errors consuming from Kafka topics, it retries based on `consumeRetryInterval`. For application-level message handling, your app should return a JSON body with `{"status": "RETRY"}` to request redelivery, or `{"status": "DROP"}` to discard the message. Tune the retry interval to balance retry speed against broker load:

```yaml
metadata:
  - name: consumeRetryInterval
    value: "500ms"
```

## Summary

Tuning Kafka consumer groups in Dapr involves balancing session timeouts, heartbeat intervals, and partition counts against your deployment scale. Use the `sticky` rebalance strategy to reduce partition movement during rolling restarts. Monitor consumer lag to detect processing bottlenecks and scale replicas up to the partition count for maximum parallelism.
