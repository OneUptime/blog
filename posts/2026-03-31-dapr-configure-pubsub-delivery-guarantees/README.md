# How to Configure Pub/Sub Delivery Guarantees in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Delivery Guarantee, At-Least-Once, Messaging

Description: Understand and configure at-least-once delivery guarantees in Dapr pub/sub, including idempotent handlers, deduplication, and ordering constraints.

---

## Overview

Dapr guarantees at-least-once message delivery - messages will be delivered at least once but may be delivered more than once during retries or failures. This guide covers how to design idempotent subscribers and use deduplication where supported.

## At-Least-Once Delivery Contract

Dapr's at-least-once guarantee means:
- If your handler returns an error, the message will be retried
- If a Dapr sidecar crashes after delivery but before ack, the message will be redelivered
- Exactly-once requires idempotent handlers or deduplication on your side

## Implementing Idempotent Handlers

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "sync"
)

var processedIDs sync.Map  // In production, use Redis or a DB

type OrderEvent struct {
    OrderID string  `json:"orderId"`
    Amount  float64 `json:"amount"`
}

func handleOrder(w http.ResponseWriter, r *http.Request) {
    var envelope struct {
        ID   string     `json:"id"`
        Data OrderEvent `json:"data"`
    }
    json.NewDecoder(r.Body).Decode(&envelope)

    // Idempotency check using the Dapr cloud event ID
    if _, alreadyProcessed := processedIDs.LoadOrStore(envelope.ID, true); alreadyProcessed {
        fmt.Printf("Duplicate message %s, skipping\n", envelope.ID)
        w.WriteHeader(200)
        json.NewEncoder(w).Encode(map[string]string{"status": "SUCCESS"})
        return
    }

    if err := processOrder(envelope.Data); err != nil {
        processedIDs.Delete(envelope.ID) // Remove so retry can reprocess
        w.WriteHeader(500)
        json.NewEncoder(w).Encode(map[string]string{"status": "RETRY"})
        return
    }

    w.WriteHeader(200)
    json.NewEncoder(w).Encode(map[string]string{"status": "SUCCESS"})
}
```

## Azure Service Bus Deduplication

Enable built-in deduplication at the broker level:

```bash
az servicebus topic create \
  --resource-group my-rg \
  --namespace-name my-ns \
  --name orders \
  --enable-duplicate-detection true \
  --duplicate-detection-history-time-window PT10M
```

Dapr passes the cloud event `id` as the message ID, which Service Bus uses for deduplication within the window.

## Ordering Guarantees by Backend

| Backend | Ordering | Deduplication |
|---------|----------|---------------|
| Redis Streams | Per consumer group | No |
| Kafka | Per partition | No |
| RabbitMQ | Per queue (single consumer) | No |
| Azure Service Bus | Per session | Built-in |
| Azure Event Hubs | Per partition | No |

## Configuring Subscription for Reliable Delivery

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-reliable-sub
spec:
  pubsubname: kafka-pubsub
  topic: orders
  deadLetterTopic: orders-dlq
  routes:
    default: /handle-order
```

Always configure a dead letter topic to capture messages that exhaust retries.

## Testing Delivery Guarantees

```bash
# Publish a message, then kill the subscriber pod mid-processing
kubectl delete pod order-processor-xxx --grace-period=0

# Verify the message is redelivered to the new pod
kubectl logs -f deploy/order-processor | grep "Processing order"
```

## Monitoring Duplicate Rates

Track idempotency key hits as a metric:

```python
from prometheus_client import Counter

duplicate_messages = Counter(
    'dapr_duplicate_messages_total',
    'Number of duplicate messages skipped',
    ['topic']
)

def handle_order(event):
    if is_duplicate(event['id']):
        duplicate_messages.labels(topic='orders').inc()
        return 'SUCCESS'
    # ... process ...
```

## Summary

Dapr provides at-least-once delivery guarantees. Design idempotent handlers using the cloud event `id` field for deduplication, or use Azure Service Bus's built-in deduplication for broker-level exactly-once semantics. Always configure dead letter topics to capture poison messages, and monitor duplicate rates to understand your real delivery patterns.
