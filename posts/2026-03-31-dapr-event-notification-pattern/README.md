# How to Implement Event Notification Pattern with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event, Pub/Sub, Notification, Microservice

Description: Learn how to implement the Event Notification pattern with Dapr pub/sub to notify downstream services of state changes without tight coupling.

---

## What is the Event Notification Pattern?

The Event Notification pattern is the simplest event-driven integration style. When something happens in one service (an order is placed, a payment is received), that service publishes a lightweight notification event. Downstream services subscribe and react independently. The publisher does not know or care who is listening.

This differs from Event-Carried State Transfer in that notification events carry minimal data (typically just IDs), and subscribers fetch the full details from the publishing service if needed.

## Publishing a Notification Event

In the order service, publish a notification after creating an order:

```go
package main

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

type OrderCreatedEvent struct {
    EventType   string `json:"eventType"`
    OrderID     string `json:"orderId"`
    CustomerID  string `json:"customerId"`
    OccurredAt  string `json:"occurredAt"`
}

func publishOrderCreated(ctx context.Context, orderID, customerID string) error {
    event := OrderCreatedEvent{
        EventType:  "OrderCreated",
        OrderID:    orderID,
        CustomerID: customerID,
        OccurredAt: time.Now().UTC().Format(time.RFC3339),
    }

    body, _ := json.Marshal(event)
    url := fmt.Sprintf("http://localhost:%s/v1.0/publish/pubsub/order-events", daprPort)

    req, _ := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return err
    }
    return resp.Body.Close()
}
```

## Subscribing to Notifications

The fulfillment service subscribes to `order-events` and fetches full order details on notification:

```go
func subscribeHandler(w http.ResponseWriter, r *http.Request) {
    var envelope struct {
        Data OrderCreatedEvent `json:"data"`
    }
    json.NewDecoder(r.Body).Decode(&envelope)
    event := envelope.Data

    if event.EventType != "OrderCreated" {
        json.NewEncoder(w).Encode(map[string]string{"status": "DROP"})
        return
    }

    // Fetch full order details from order service via Dapr
    order, err := fetchOrderDetails(r.Context(), event.OrderID)
    if err != nil {
        // Return retry signal on transient failure
        json.NewEncoder(w).Encode(map[string]string{"status": "RETRY"})
        return
    }

    // Process fulfillment
    if err := startFulfillment(r.Context(), order); err != nil {
        json.NewEncoder(w).Encode(map[string]string{"status": "RETRY"})
        return
    }

    json.NewEncoder(w).Encode(map[string]string{"status": "SUCCESS"})
}

func getSubscriptions(w http.ResponseWriter, r *http.Request) {
    subs := []map[string]string{
        {"pubsubname": "pubsub", "topic": "order-events", "route": "/fulfill"},
    }
    json.NewEncoder(w).Encode(subs)
}
```

## Multiple Independent Subscribers

Dapr pub/sub supports fan-out. Multiple services can subscribe to the same topic independently:

**Email service** subscribes to `order-events` to send confirmation emails.
**Analytics service** subscribes to record order metrics.
**Inventory service** subscribes to reserve stock.

Dapr uses each application's `app-id` as an implicit consumer group, so applications with different app IDs each receive a copy of every event:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-events-fulfillment
spec:
  pubsubname: pubsub
  topic: order-events
  routes:
    default: /fulfill
scopes:
  - fulfillment-service
---
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-events-email
spec:
  pubsubname: pubsub
  topic: order-events
  routes:
    default: /send-confirmation
scopes:
  - email-service
```

## Filtering Events by Type

When multiple event types are published to the same topic, use CloudEvents filtering in the subscription:

```yaml
spec:
  pubsubname: pubsub
  topic: order-events
  routes:
    rules:
      - match: event.type == "OrderCreated"
        path: /on-order-created
      - match: event.type == "OrderCancelled"
        path: /on-order-cancelled
    default: /on-unknown-event
```

## Summary

The Event Notification pattern with Dapr decouples services cleanly - the order service publishes a lightweight event with just IDs, and any number of subscribers react independently without the publisher knowing about them. Dapr handles delivery, retries, and dead lettering, making the publisher code simple and the integration resilient to subscriber failures.
