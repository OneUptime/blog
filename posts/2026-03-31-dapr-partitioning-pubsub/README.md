# How to Implement Partitioning with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Partitioning, Kafka, Ordering

Description: Use Dapr pub/sub partitioning to ensure ordered message delivery per entity while scaling consumers horizontally across Kafka partitions.

---

## Why Partition Pub/Sub Messages?

Partitioning guarantees that all messages for the same entity (e.g., the same order or user) go to the same partition and are processed in order by the same consumer. This is essential for event sourcing and scenarios where event ordering matters.

## Kafka Topic with Adequate Partitions

```bash
# Create topic with 20 partitions to match max consumer count
kafka-topics.sh --bootstrap-server kafka:9092 \
  --create --topic orders \
  --partitions 20 \
  --replication-factor 3 \
  --config retention.ms=604800000 \
  --config compression.type=lz4
```

## Dapr Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka-broker:9092"
  - name: consumerGroup
    value: "order-service"
  - name: authType
    value: "none"
```

## Publishing with Partition Key

Dapr uses the `partitionKey` metadata field to route messages to Kafka partitions:

```go
package main

import (
    "context"
    "encoding/json"

    dapr "github.com/dapr/go-sdk/client"
)

type Order struct {
    OrderID    string  `json:"orderId"`
    CustomerID string  `json:"customerId"`
    Amount     float64 `json:"amount"`
    Status     string  `json:"status"`
}

func publishOrder(client dapr.Client, order Order) error {
    data, _ := json.Marshal(order)

    // Use customerId as partition key for ordering per customer
    return client.PublishEvent(context.Background(), "order-pubsub", "orders", data,
        dapr.PublishEventWithMetadata(map[string]string{
            "partitionKey": order.CustomerID,
        }))
}
```

## Subscription with Concurrency Control

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: order-subscription
spec:
  pubsubname: order-pubsub
  topic: orders
  route: /orders
```

```python
from fastapi import FastAPI
from pydantic import BaseModel
import asyncio

app = FastAPI()

# Per-partition processing lock to maintain ordering within a partition
partition_locks: dict[str, asyncio.Lock] = {}

class CloudEvent(BaseModel):
    id: str
    source: str
    data: dict

@app.post("/orders")
async def handle_order(event: CloudEvent):
    customer_id = event.data.get("customerId", "unknown")

    # Serialize processing per customer to maintain order
    if customer_id not in partition_locks:
        partition_locks[customer_id] = asyncio.Lock()

    async with partition_locks[customer_id]:
        await process_order_event(event.data)

    return {"status": "SUCCESS"}
```

## Consumer Group Rebalancing

```bash
# Check partition assignment across consumers
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --describe --group order-service

# Output shows which partition each pod owns:
# CONSUMER-ID                TOPIC  PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# order-service-pod-0        orders 0          1500            1500            0
# order-service-pod-0        orders 1          2300            2300            0
# order-service-pod-1        orders 2          1800            1800            0
```

## Handling Partition Rebalance Gracefully

```python
@app.on_event("shutdown")
async def shutdown():
    # Allow in-flight messages to complete before pod terminates
    # Kubernetes terminationGracePeriodSeconds should match this
    import asyncio
    await asyncio.sleep(10)
    print("Graceful shutdown complete")
```

```yaml
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 30
```

## Summary

Dapr pub/sub partitioning with Kafka provides ordered-per-key delivery at horizontal scale. The `partitionKey` metadata field maps directly to Kafka's partition key, ensuring all events for the same entity land in the same partition and are processed sequentially. Matching your topic partition count to your maximum replica count ensures every consumer gets work during peak load.
