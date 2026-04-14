# How to Handle Message Ordering in Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Message Ordering, Kafka, Microservice

Description: Learn strategies for ensuring ordered message processing in Dapr pub/sub, including partition-based ordering with Kafka and sequential consumer patterns.

---

## The Challenge of Message Ordering

Most message brokers provide at-least-once delivery with no strict ordering guarantees across partitions. Achieving ordered processing in Dapr pub/sub requires selecting the right broker and applying the right patterns.

## Kafka Partition-Based Ordering

Kafka guarantees ordering within a single partition. Use a consistent partition key to route related messages to the same partition.

Configure the Dapr Kafka pub/sub component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: kafka:9092
  - name: consumerGroup
    value: order-processor
  - name: initialOffset
    value: oldest
```

When publishing, include a partition key using the `partitionKey` metadata field:

```bash
curl -X POST "http://localhost:3500/v1.0/publish/pubsub/orders?metadata.partitionKey=customer-42" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "1001", "customerId": "42", "event": "created"}'
```

All messages for `customer-42` are routed to the same partition and consumed in order.

## Application-Level Ordering with Sequence Numbers

When the broker does not support partitioning, use sequence numbers in your message payload:

```javascript
// Publisher
let seq = 0;
async function publishEvent(event) {
  await fetch("http://localhost:3500/v1.0/publish/pubsub/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seq: ++seq, ...event }),
  });
}
```

```javascript
// Subscriber - buffer and reorder
const pending = new Map();
let nextExpected = 1;

app.post("/orders", (req, res) => {
  const { seq, ...event } = req.body.data;
  pending.set(seq, event);

  while (pending.has(nextExpected)) {
    process(pending.get(nextExpected));
    pending.delete(nextExpected);
    nextExpected++;
  }
  res.sendStatus(200);
});
```

## Using a Single Consumer Instance

For strict ordering, run a single consumer instance and disable concurrent message handling:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: kafka:9092
  - name: consumerGroup
    value: order-processor
  - name: maxConcurrentHandlers
    value: "1"
```

Scale the deployment to one replica:

```yaml
spec:
  replicas: 1
```

This eliminates race conditions between consumers at the cost of throughput.

## Redis Streams Ordering

Redis Streams preserves insertion order within a stream. Use the Dapr Redis Streams pub/sub component and a single consumer group:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: consumerID
    value: order-processor-1
```

## Trade-offs

| Strategy | Ordering Guarantee | Scalability |
|---|---|---|
| Kafka partition key | Per-partition order | High |
| Single consumer | Global order | Low |
| Sequence numbers | App-enforced order | Medium |

## Summary

Achieving message ordering in Dapr pub/sub requires selecting a broker that supports partitioning, such as Kafka, and routing related messages using a consistent partition key. For strict global ordering, use a single consumer instance. Application-level sequence numbers provide a broker-agnostic fallback.
