# How to Implement Event Store with Dapr and PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event Sourcing, PostgreSQL, State Management, Architecture

Description: Build an event store using Dapr state management with PostgreSQL to persist domain events, enabling event sourcing patterns with reliable ordered event storage.

---

Event sourcing persists state as a sequence of domain events rather than current state snapshots. Dapr's state management API with a PostgreSQL backend provides the persistence layer for an event store, while Dapr's pub/sub handles event distribution to downstream consumers.

## Why PostgreSQL for Event Storage

PostgreSQL offers:
- ACID transactions for atomic event appends
- JSON/JSONB storage for flexible event schemas
- Array operators for querying event streams by aggregate ID
- Strong ordering guarantees with sequential IDs

## Dapr PostgreSQL State Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: event-store
spec:
  type: state.postgresql
  version: v1
  metadata:
    - name: connectionString
      value: "host=postgres user=events password=secret dbname=events sslmode=disable"
    - name: tableName
      value: "domain_events"
```

## Event Schema

Each event is stored as a JSON value with a structured key format:

```yaml
Key: {aggregateType}:{aggregateId}:{sequenceNumber}
Value: {eventType, payload, metadata, timestamp}
```

## Appending Events

Use the Dapr state API to append events transactionally. Each event gets a unique key combining the aggregate ID and sequence number.

```go
// event_store.go
package eventstore

import (
    "context"
    "encoding/json"
    "fmt"
    "time"
    dapr "github.com/dapr/go-sdk/client"
)

type Event struct {
    EventType     string                 `json:"eventType"`
    AggregateID   string                 `json:"aggregateId"`
    AggregateType string                 `json:"aggregateType"`
    Sequence      int64                  `json:"sequence"`
    Payload       map[string]interface{} `json:"payload"`
    OccurredAt    time.Time              `json:"occurredAt"`
}

func AppendEvent(client dapr.Client, event Event) error {
    key := fmt.Sprintf("%s:%s:%d", event.AggregateType, event.AggregateID, event.Sequence)

    data, err := json.Marshal(event)
    if err != nil {
        return fmt.Errorf("failed to marshal event: %w", err)
    }

    return client.SaveStateWithETag(
        context.Background(),
        "event-store",
        key,
        data,
        "",  // empty ETag = create new (fails if key exists)
        map[string]string{},
        dapr.WithConcurrency(dapr.StateConcurrencyFirstWrite),
    )
}
```

## Reading an Event Stream

Query events for a specific aggregate by iterating over sequence numbers:

```go
func LoadEvents(client dapr.Client, aggregateType, aggregateID string) ([]Event, error) {
    var events []Event
    for seq := int64(1); ; seq++ {
        key := fmt.Sprintf("%s:%s:%d", aggregateType, aggregateID, seq)
        item, err := client.GetState(context.Background(), "event-store", key, nil)
        if err != nil || item == nil || len(item.Value) == 0 {
            break
        }
        var event Event
        json.Unmarshal(item.Value, &event)
        events = append(events, event)
    }
    return events, nil
}
```

## Publishing Events After Persistence

After persisting an event to the store, publish it to the message bus for downstream consumers:

```go
func AppendAndPublish(client dapr.Client, event Event) error {
    if err := AppendEvent(client, event); err != nil {
        return fmt.Errorf("failed to append event: %w", err)
    }

    return client.PublishEvent(
        context.Background(),
        "pubsub",
        event.EventType,
        event,
    )
}
```

## Rebuilding Aggregate State

Replay events to rebuild current state:

```go
func RebuildOrder(events []Event) Order {
    var order Order
    for _, e := range events {
        switch e.EventType {
        case "OrderCreated":
            order.ID = e.AggregateID
            order.Status = "pending"
        case "OrderPaid":
            order.Status = "paid"
        case "OrderShipped":
            order.Status = "shipped"
        }
    }
    return order
}
```

## Summary

Using Dapr state management with PostgreSQL as an event store gives you a reliable, ordered append-only log for domain events. Combined with Dapr pub/sub for event distribution, this pattern implements event sourcing without requiring specialized event store infrastructure.
