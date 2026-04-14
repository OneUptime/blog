# How to Implement Event Store with Dapr and MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event Sourcing, MongoDB, State Management, Architecture

Description: Build an event store using Dapr state management backed by MongoDB to persist domain events with flexible document schemas and efficient stream queries.

---

## Overview

MongoDB's document model is a natural fit for event sourcing. Each event is a document with a flexible payload schema, and collections provide an ordered, append-only log. Using Dapr's MongoDB state store component abstracts away the MongoDB driver while still letting you leverage its query capabilities.

## Configure the MongoDB State Store

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: event-store
spec:
  type: state.mongodb
  version: v1
  metadata:
    - name: host
      value: "mongodb://mongo:27017"
    - name: databaseName
      value: "eventstore"
    - name: collectionName
      value: "domain_events"
    - name: writeconcern
      value: "majority"
    - name: readconcern
      value: "majority"
```

The `writeconcern: majority` setting ensures events are durably written to a majority of replica set members before the write is acknowledged.

## Event Document Structure

Define a consistent event schema for all domain events:

```go
// event.go
package eventstore

import "time"

type DomainEvent struct {
    AggregateType string                 `json:"aggregateType"`
    AggregateID   string                 `json:"aggregateId"`
    Sequence      int64                  `json:"sequence"`
    EventType     string                 `json:"eventType"`
    Payload       map[string]interface{} `json:"payload"`
    Metadata      map[string]string      `json:"metadata"`
    OccurredAt    time.Time              `json:"occurredAt"`
    SchemaVersion int                    `json:"schemaVersion"`
}
```

## Appending Events with Optimistic Concurrency

Use ETag-based optimistic concurrency to prevent duplicate event writes:

```go
// store.go
package eventstore

import (
    "context"
    "encoding/json"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

const storeName = "event-store"

func AppendEvent(ctx context.Context, client dapr.Client, event DomainEvent) error {
    key := buildKey(event.AggregateType, event.AggregateID, event.Sequence)

    data, err := json.Marshal(event)
    if err != nil {
        return fmt.Errorf("failed to marshal event: %w", err)
    }

    // Use first-write-wins concurrency: fails if key already exists
    return client.SaveStateWithETag(ctx, storeName, key, data, "", map[string]string{},
        dapr.WithConcurrency(dapr.StateConcurrencyFirstWrite),
        dapr.WithConsistency(dapr.StateConsistencyStrong),
    )
}

func buildKey(aggregateType, aggregateID string, seq int64) string {
    return fmt.Sprintf("%s|%s|%06d", aggregateType, aggregateID, seq)
}
```

## Loading an Event Stream

Read all events for an aggregate by iterating over sequence keys:

```go
func LoadEventStream(ctx context.Context, client dapr.Client, aggregateType, aggregateID string) ([]DomainEvent, error) {
    var events []DomainEvent

    for seq := int64(1); ; seq++ {
        key := buildKey(aggregateType, aggregateID, seq)
        item, err := client.GetState(ctx, storeName, key, map[string]string{
            "consistency": "strong",
        })
        if err != nil || item == nil || len(item.Value) == 0 {
            break
        }

        var event DomainEvent
        if err := json.Unmarshal(item.Value, &event); err != nil {
            return nil, fmt.Errorf("failed to unmarshal event at seq %d: %w", seq, err)
        }
        events = append(events, event)
    }

    return events, nil
}
```

## Rebuilding Aggregate State

Apply events in sequence to reconstruct current state:

```go
type Account struct {
    ID      string
    Balance float64
    Status  string
}

func RebuildAccount(events []DomainEvent) Account {
    var acc Account
    for _, e := range events {
        switch e.EventType {
        case "AccountOpened":
            acc.ID = e.AggregateID
            acc.Balance = e.Payload["initialBalance"].(float64)
            acc.Status = "active"
        case "MoneyDeposited":
            acc.Balance += e.Payload["amount"].(float64)
        case "MoneyWithdrawn":
            acc.Balance -= e.Payload["amount"].(float64)
        case "AccountClosed":
            acc.Status = "closed"
        }
    }
    return acc
}
```

## Publishing Events After Persistence

After persisting, publish events to notify downstream services:

```go
func AppendAndPublish(ctx context.Context, client dapr.Client, event DomainEvent) error {
    if err := AppendEvent(ctx, client, event); err != nil {
        return fmt.Errorf("persist failed: %w", err)
    }

    return client.PublishEvent(ctx, "pubsub", event.EventType, event)
}
```

## Example: Command Handler

Wire everything together in a command handler:

```go
func HandleWithdraw(ctx context.Context, client dapr.Client, accountID string, amount float64) error {
    events, err := LoadEventStream(ctx, client, "Account", accountID)
    if err != nil {
        return err
    }

    account := RebuildAccount(events)
    if account.Balance < amount {
        return fmt.Errorf("insufficient funds")
    }

    nextSeq := int64(len(events) + 1)
    event := DomainEvent{
        AggregateType: "Account",
        AggregateID:   accountID,
        Sequence:      nextSeq,
        EventType:     "MoneyWithdrawn",
        Payload:       map[string]interface{}{"amount": amount},
        OccurredAt:    time.Now(),
        SchemaVersion: 1,
    }

    return AppendAndPublish(ctx, client, event)
}
```

## Summary

Dapr's MongoDB state store provides a reliable backend for event sourcing, combining document flexibility with strong consistency options. Using sequential keys and first-write-wins concurrency prevents duplicate events, while rebuilding aggregate state from the full event stream ensures accuracy. Pairing persistence with Dapr pub/sub decouples event production from consumption across services.
