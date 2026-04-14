# How to Handle Kafka Partitioning with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kafka, Partitioning, Pub/Sub, Ordering, Throughput, Microservice

Description: Manage Kafka partition keys and ordering guarantees in Dapr pub/sub to ensure related messages are processed in sequence and throughput scales horizontally.

---

## Overview

Kafka partitions are the unit of parallelism and ordering. Messages within a partition are ordered; messages across partitions are not. When using Dapr with Kafka, controlling partition key assignment ensures that related messages (such as all events for one order or one user) go to the same partition and are processed sequentially. This guide explains how to set partition keys and design topics for Dapr applications.

## How Dapr Assigns Partition Keys

Dapr uses the `partitionKey` metadata field when publishing to Kafka. If not specified, Kafka distributes messages round-robin across partitions.

## Setting the Partition Key

When publishing via the Dapr HTTP API, pass the partition key in metadata:

```bash
curl -X POST "http://localhost:3500/v1.0/publish/kafka-pubsub/order-events?metadata.partitionKey=customer-123" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORD-9001", "customerId": "customer-123", "action": "created"}'
```

## Partition Key in Go SDK

```go
package main

import (
    "context"
    "encoding/json"
    dapr "github.com/dapr/go-sdk/client"
)

func publishOrder(client dapr.Client, order Order) error {
    data, _ := json.Marshal(order)
    return client.PublishEvent(
        context.Background(),
        "kafka-pubsub",
        "order-events",
        data,
        dapr.PublishEventWithMetadata(map[string]string{
            "partitionKey": order.CustomerID,
        }),
    )
}
```

## Topic Partition Design

Create topics with enough partitions for your expected parallelism:

```bash
# Create topic with 12 partitions
kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --create \
  --topic order-events \
  --partitions 12 \
  --replication-factor 3
```

A good rule of thumb: create 2-3x the number of partitions as your maximum expected consumer count.

## Dapr Component for Kafka

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
      value: "kafka-0.kafka:9092,kafka-1.kafka:9092,kafka-2.kafka:9092"
    - name: consumerGroup
      value: "order-processor"
    - name: authType
      value: "none"
    - name: initialOffset
      value: "newest"
```

## Verifying Partition Distribution

```bash
# Describe consumer group to see partition assignments
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --group order-processor

# Output:
# CONSUMER-ID  HOST        TOPIC         PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# order-0      /10.0.0.1   order-events  0          5000            5000            0
# order-1      /10.0.0.2   order-events  1          4800            4800            0
```

## Ordering Guarantees

With consistent partition keys:
- All events for `customer-123` go to partition 3 (Kafka's murmur2 hash)
- A single Dapr consumer processes partition 3
- Messages arrive in published order

Without partition keys:
- Messages are round-robined across partitions
- No ordering across messages
- Maximum throughput but no sequence guarantees

## Rebalancing After Scaling

When you scale Dapr consumer replicas, Kafka triggers a rebalance. During rebalancing (typically a few seconds), consumption pauses. Use static group membership to minimize downtime during deployments:

```yaml
metadata:
  - name: groupInstanceID
    value: "$(HOSTNAME)"
```

## Summary

Dapr passes partition keys to Kafka through the `partitionKey` publish metadata field. Use customer IDs, order IDs, or other natural grouping keys to ensure ordered processing of related events. Design topics with sufficient partitions to match your scaling requirements, and use static group membership to reduce rebalancing disruption during deployments.
