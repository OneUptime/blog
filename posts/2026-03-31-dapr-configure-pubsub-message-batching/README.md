# How to Configure Pub/Sub Message Batching in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Batch, Throughput, Messaging

Description: Configure bulk publish and bulk subscribe in Dapr to batch messages for higher throughput and reduced per-message overhead in high-volume scenarios.

---

## Overview

Dapr supports bulk publish (send many messages in one API call) and bulk subscribe (receive multiple messages per handler invocation). Both features reduce HTTP overhead and improve throughput for high-volume workloads.

## Bulk Publish API

Send multiple messages in a single request:

```bash
curl -X POST http://localhost:3500/v1.0/publish/bulk/kafka-pubsub/orders \
  -H "Content-Type: application/json" \
  -d '[
    {
      "entryId": "entry1",
      "event": {"orderId": "001", "amount": 100},
      "contentType": "application/json"
    },
    {
      "entryId": "entry2",
      "event": {"orderId": "002", "amount": 200},
      "contentType": "application/json"
    },
    {
      "entryId": "entry3",
      "event": {"orderId": "003", "amount": 300},
      "contentType": "application/json"
    }
  ]'
```

The response includes per-entry status so you can handle partial failures:

```json
{
  "failedEntries": [
    {"entryId": "entry2", "error": "too large"}
  ]
}
```

## Bulk Publish with Go SDK

```go
package main

import (
    dapr "github.com/dapr/go-sdk/client"
    "context"
    "encoding/json"
    "fmt"
)

func publishBatch(client dapr.Client, orders []Order) error {
    events := make([]interface{}, len(orders))
    for i, order := range orders {
        data, err := json.Marshal(order)
        if err != nil {
            return err
        }
        events[i] = &dapr.PublishEventsEvent{
            EntryID:     fmt.Sprintf("entry-%d", i),
            Data:        data,
            ContentType: "application/json",
        }
    }

    result, err := client.PublishEvents(
        context.Background(), "kafka-pubsub", "orders", events,
    )
    if err != nil {
        return err
    }
    if len(result.FailedEvents) > 0 {
        fmt.Printf("Failed events: %d\n", len(result.FailedEvents))
    }
    return nil
}
```

## Enabling Bulk Subscribe

Configure bulk subscribe in the subscription definition:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-bulk-sub
spec:
  pubsubname: kafka-pubsub
  topic: orders
  routes:
    default: /handle-orders-bulk
  bulkSubscribe:
    enabled: true
    maxMessagesCount: 250
    maxAwaitDurationMs: 2000
```

## Handling Bulk Messages in Your App

```go
type BulkMessage struct {
    Entries []BulkEntry `json:"entries"`
}

type BulkEntry struct {
    EntryId     string          `json:"entryId"`
    Event       json.RawMessage `json:"event"`
    ContentType string          `json:"contentType"`
}

type BulkResponse struct {
    Statuses []BulkStatus `json:"statuses"`
}

type BulkStatus struct {
    EntryId string `json:"entryId"`
    Status  string `json:"status"`
}

func handleOrdersBulk(w http.ResponseWriter, r *http.Request) {
    var bulk BulkMessage
    json.NewDecoder(r.Body).Decode(&bulk)

    statuses := make([]BulkStatus, len(bulk.Entries))
    for i, entry := range bulk.Entries {
        err := processOrder(entry.Event)
        if err != nil {
            statuses[i] = BulkStatus{EntryId: entry.EntryId, Status: "RETRY"}
        } else {
            statuses[i] = BulkStatus{EntryId: entry.EntryId, Status: "SUCCESS"}
        }
    }

    w.WriteHeader(200)
    json.NewEncoder(w).Encode(BulkResponse{Statuses: statuses})
}
```

## Tuning Batch Parameters

| Parameter | Low Latency | High Throughput |
|-----------|-------------|-----------------|
| `maxMessagesCount` | 10 | 500 |
| `maxAwaitDurationMs` | 100 | 5000 |

## Summary

Dapr's bulk publish and bulk subscribe APIs significantly improve throughput by reducing per-message HTTP overhead. Use bulk publish to send batches up to your component's limit, enable bulk subscribe with appropriate `maxMessagesCount` and `maxAwaitDurationMs` tuning, and return per-entry status codes to handle partial failures gracefully.
