# How to Scale Dapr Pub/Sub Consumers Horizontally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Autoscaling, Consumer Group, Kafka

Description: Scale Dapr pub/sub consumers horizontally with consumer groups, KEDA triggers, and proper partition assignment to process high message volumes.

---

## Consumer Group Scaling

Dapr pub/sub uses consumer groups to distribute messages across multiple instances of the same app. Each message is delivered to exactly one instance in the group.

## Kafka Pub/Sub Component with Consumer Group

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
    value: "kafka-broker.default.svc.cluster.local:9092"
  - name: consumerGroup
    value: "order-processors"
  - name: authType
    value: "none"
  - name: maxMessageBytes
    value: "1048576"
  - name: consumeRetryInterval
    value: "200ms"
```

## Subscription Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: order-subscription
spec:
  pubsubname: order-pubsub
  topic: orders
  route: /orders/process
  bulkSubscribe:
    enabled: true
    maxMessagesCount: 100
    maxAwaitDurationMs: 1000
```

## Bulk Message Handler

```python
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any

app = FastAPI()

class BulkMessageEntry(BaseModel):
    entryId: str
    event: Any
    contentType: str

class BulkSubscribeRequest(BaseModel):
    entries: list[BulkMessageEntry]

@app.post("/orders/process")
async def process_orders(body: BulkSubscribeRequest):
    responses = []
    for entry in body.entries:
        try:
            await process_single_order(entry.event)
            responses.append({"entryId": entry.entryId, "status": "SUCCESS"})
        except Exception as e:
            responses.append({"entryId": entry.entryId, "status": "RETRY", "message": str(e)})
    return {"statuses": responses}
```

## KEDA ScaledObject for Auto-Scaling Consumers

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor-scaledobject
spec:
  scaleTargetRef:
    name: order-processor
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka-broker.default.svc.cluster.local:9092
      consumerGroup: order-processors
      topic: orders
      lagThreshold: "50"
      offsetResetPolicy: latest
```

## Ensuring Enough Kafka Partitions

```bash
# Create topic with enough partitions for max replica count
kafka-topics.sh --bootstrap-server kafka:9092 \
  --create --topic orders \
  --partitions 20 \
  --replication-factor 3

# Increase partitions if needed
kafka-topics.sh --bootstrap-server kafka:9092 \
  --alter --topic orders \
  --partitions 40
```

## Deployment with Autoscaling

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-processor
  template:
    metadata:
      labels:
        app: order-processor
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-processor"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: order-processor
        image: myregistry/order-processor:latest
        resources:
          requests:
            cpu: "500m"
            memory: "256Mi"
```

## Monitoring Consumer Lag

```bash
# Check consumer group lag
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --describe --group order-processors

# Watch lag over time
watch -n 5 "kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --describe --group order-processors | tail -5"
```

## Summary

Dapr pub/sub consumers scale horizontally through consumer groups - Dapr automatically partitions messages across instances sharing the same app-id. For event-driven autoscaling, KEDA's Kafka trigger scales your deployment based on consumer lag. The key requirement is having at least as many Kafka partitions as your maximum replica count to ensure full parallelism.
