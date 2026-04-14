# How to Optimize Dapr Pub/Sub Costs with Message Batching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Cost Optimization, Message Broker, Performance

Description: Learn how to configure Dapr pub/sub message batching to reduce broker API calls, lower cloud messaging costs, and improve throughput for high-volume services.

---

## Why Message Batching Reduces Costs

Cloud-hosted message brokers like Azure Service Bus, AWS SQS, and Google Pub/Sub charge per API call or per message operation. Publishing or consuming messages one-by-one can multiply your bill significantly under high load. Dapr's pub/sub batching allows multiple messages to be grouped into a single broker operation, reducing API calls and associated costs.

## Configuring Bulk Publish in Dapr

Dapr supports bulk publish (introduced in 1.10, stable since 1.17), which sends multiple messages in a single call:

```go
package main

import (
    "context"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, _ := dapr.NewClient()
    defer client.Close()

    events := []interface{}{
        map[string]string{"orderId": "101"},
        map[string]string{"orderId": "102"},
        map[string]string{"orderId": "103"},
    }

    result := client.PublishEvents(
        context.Background(),
        "order-pubsub",
        "orders",
        events,
    )
    if result.Error != nil {
        panic(result.Error)
    }

    if len(result.FailedEvents) > 0 {
        fmt.Printf("%d events failed to publish\n", len(result.FailedEvents))
    }
}
```

## Configuring the Pub/Sub Component for Batching

Configure the underlying broker component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-pubsub
  namespace: production
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: servicebus-secret
      key: connectionString
  - name: publishMaxRetries
    value: "3"
  - name: minConnectionRecoveryInSec
    value: "2"
```

Then configure bulk subscribe via a Subscription resource:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-bulk-subscription
spec:
  pubsubname: order-pubsub
  topic: orders
  routes:
    default: /orders
  bulkSubscribe:
    enabled: true
    maxMessagesCount: 100
    maxAwaitDurationMs: 1000
```

## Bulk Subscribe Handler

On the consumer side, handle bulk messages with a standard HTTP endpoint. When using the declarative Subscription above with `bulkSubscribe` enabled, Dapr delivers batches to your route:

```python
from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/orders")
async def handle_bulk_orders(request: Request):
    bulk_message = await request.json()
    statuses = []
    for entry in bulk_message.get("entries", []):
        order = entry.get("event", {})
        # process each order
        statuses.append({"entryId": entry["entryId"], "status": "SUCCESS"})
    return {"statuses": statuses}
```

## Estimating Cost Savings

Compare API call volume before and after batching:

```bash
# Check current message throughput metrics
kubectl port-forward svc/dapr-dashboard 8080:8080 -n dapr-system
# Navigate to http://localhost:8080 and check pub/sub metrics

# Or query Prometheus directly
curl -s "http://prometheus:9090/api/v1/query?query=dapr_pubsub_publish_count[5m]"
```

For 10,000 messages per minute at $0.40 per million API calls (AWS SQS pricing):
- Without batching: 10,000 calls/min = $0.24/hr
- With batching (100 per batch): 100 calls/min = $0.0024/hr - roughly 100x savings

## Summary

Dapr's bulk publish and bulk subscribe APIs reduce message broker API calls by grouping multiple messages into single operations, directly lowering cloud messaging costs. Configure `bulkSubscribe` on your Subscription resource and use the `PublishEvents` SDK method to enable batching. For high-throughput services, batching can reduce broker costs by an order of magnitude while also improving overall publish throughput.
