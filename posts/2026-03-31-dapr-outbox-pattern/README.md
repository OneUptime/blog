# How to Implement the Outbox Pattern with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Outbox Pattern, Pub/Sub, State, Reliability

Description: Learn how to implement the transactional outbox pattern using Dapr's state and pub/sub building blocks to guarantee at-least-once event delivery.

---

## Overview

The Outbox pattern solves dual-write problems in event-driven systems. Instead of writing to a database and publishing an event separately (risking partial failure), you write both the domain state and the outbox event in a single atomic operation. A relay then reads the outbox and publishes events.

## The Problem

Without the outbox pattern:

```text
1. Save order to database  - SUCCESS
2. Publish order event     - FAILURE (message broker down)
```

The order is saved but downstream services never know about it.

## Implementing the Outbox Pattern with Dapr

> **Note:** Dapr v1.12+ includes built-in outbox pattern support via state store component metadata (`outboxPublishPubsub` and `outboxPublishTopic`), which automatically publishes state changes as events without manual relay code. The manual implementation below is useful for understanding the pattern and for cases where you need custom relay logic.

Dapr's transactional state operations let you atomically write domain state and outbox entries using a state store that supports transactions (Redis, PostgreSQL, etc.).

### State Store Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.postgresql
  version: v1
  metadata:
    - name: connectionString
      value: "host=postgres user=app password=secret dbname=appdb sslmode=disable"
    - name: actorStateStore
      value: "true"
```

### Atomic Write: Domain State + Outbox Entry

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

type Order struct {
    ID         string  `json:"id"`
    CustomerID string  `json:"customerId"`
    Total      float64 `json:"total"`
    Status     string  `json:"status"`
}

type OutboxEntry struct {
    EventType string          `json:"eventType"`
    Payload   json.RawMessage `json:"payload"`
    Published bool            `json:"published"`
}

func createOrder(ctx context.Context, client dapr.Client, order Order) error {
    orderBytes, _ := json.Marshal(order)

    outboxEntry := OutboxEntry{
        EventType: "order.created",
        Payload:   orderBytes,
        Published: false,
    }
    outboxBytes, _ := json.Marshal(outboxEntry)

    // Atomic transaction: save order + outbox entry
    ops := []*dapr.StateOperation{
        {
            Type: dapr.StateOperationTypeUpsert,
            Item: &dapr.SetStateItem{
                Key:   fmt.Sprintf("order:%s", order.ID),
                Value: orderBytes,
            },
        },
        {
            Type: dapr.StateOperationTypeUpsert,
            Item: &dapr.SetStateItem{
                Key:   fmt.Sprintf("outbox:%s", order.ID),
                Value: outboxBytes,
            },
        },
    }

    return client.ExecuteStateTransaction(ctx, "statestore", nil, ops)
}
```

### Outbox Relay (Publisher)

A background goroutine periodically reads unpublished outbox entries and publishes them:

```go
func outboxRelay(ctx context.Context, client dapr.Client) {
    ticker := time.NewTicker(500 * time.Millisecond)
    defer ticker.Stop()

    for range ticker.C {
        processOutbox(ctx, client)
    }
}

func processOutbox(ctx context.Context, client dapr.Client) {
    // In production, use a query-capable state store or database
    // Here we scan known pending keys
    pendingKeys := getPendingOutboxKeys()

    for _, key := range pendingKeys {
        item, err := client.GetState(ctx, "statestore", key, nil)
        if err != nil || item.Value == nil {
            continue
        }

        var entry OutboxEntry
        json.Unmarshal(item.Value, &entry)

        if entry.Published {
            continue
        }

        // Publish the event
        err = client.PublishEvent(ctx, "pubsub", entry.EventType, entry.Payload)
        if err != nil {
            continue
        }

        // Mark as published
        entry.Published = true
        entryBytes, _ := json.Marshal(entry)
        client.SaveState(ctx, "statestore", key, entryBytes, nil)
    }
}
```

### Idempotent Subscriber

Since the relay uses at-least-once delivery, subscribers must be idempotent:

```go
func orderCreatedHandler(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var order Order
    json.Unmarshal(e.RawData, &order)

    // Check idempotency key
    existing, _ := client.GetState(ctx, "statestore", "processed:"+order.ID, nil)
    if existing.Value != nil {
        return false, nil // Already processed
    }

    // Process the event
    processOrder(order)

    // Mark as processed
    client.SaveState(ctx, "statestore", "processed:"+order.ID, []byte("true"), nil)
    return false, nil
}
```

## Summary

The transactional outbox pattern with Dapr eliminates dual-write failures by atomically persisting domain state and outbox events using Dapr's transactional state operations. A background relay reads unpublished entries and publishes them via Dapr pub/sub, ensuring at-least-once delivery. Idempotent subscribers handle potential duplicate delivery gracefully.
