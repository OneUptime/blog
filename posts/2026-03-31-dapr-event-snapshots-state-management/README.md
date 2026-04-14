# How to Implement Event Snapshots with Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event Sourcing, Snapshot, State Management, Architecture

Description: Implement aggregate snapshots using Dapr state management to avoid replaying entire event histories, reducing load time for aggregates with long event streams.

---

In event sourcing, rebuilding aggregate state requires replaying all events from the beginning of the stream. As an aggregate accumulates hundreds or thousands of events, this replay becomes slow. Snapshots solve this by persisting the current aggregate state at a point in time, so only events after the snapshot need replaying.

## Snapshot Strategy

The common approach is to take a snapshot every N events. When loading an aggregate:
1. Check if a snapshot exists
2. If yes, load the snapshot and only replay events after it
3. If no, replay all events from the beginning

## Snapshot Storage with Dapr

Use a separate Dapr state store (or the same one with a different key prefix) for snapshots:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: snapshot-store
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
    - name: keyPrefix
      value: "name"
```

## Snapshot Data Structure

```go
// snapshot.go
package eventstore

import "time"

type Snapshot struct {
    AggregateType string      `json:"aggregateType"`
    AggregateID   string      `json:"aggregateId"`
    LastSequence  int64       `json:"lastSequence"`
    State         interface{} `json:"state"`
    TakenAt       time.Time   `json:"takenAt"`
}
```

## Saving a Snapshot

```go
func SaveSnapshot(client dapr.Client, aggregateType, aggregateID string, state interface{}, lastSeq int64) error {
    snap := Snapshot{
        AggregateType: aggregateType,
        AggregateID:   aggregateID,
        LastSequence:  lastSeq,
        State:         state,
        TakenAt:       time.Now(),
    }

    data, err := json.Marshal(snap)
    if err != nil {
        return err
    }

    key := fmt.Sprintf("%s:%s", aggregateType, aggregateID)
    return client.SaveState(context.Background(), "snapshot-store", key, data, nil)
}
```

## Loading Aggregate with Snapshot

```go
func LoadAggregate(client dapr.Client, aggregateType, aggregateID string) (Order, error) {
    var startSeq int64 = 1
    var order Order

    // Try to load the snapshot first
    snapKey := fmt.Sprintf("%s:%s", aggregateType, aggregateID)
    snapItem, _ := client.GetState(context.Background(), "snapshot-store", snapKey, nil)

    if snapItem != nil && len(snapItem.Value) > 0 {
        var snap Snapshot
        json.Unmarshal(snapItem.Value, &snap)
        stateBytes, _ := json.Marshal(snap.State)
        json.Unmarshal(stateBytes, &order)
        startSeq = snap.LastSequence + 1
    }

    // Replay only events after the snapshot
    for seq := startSeq; ; seq++ {
        key := fmt.Sprintf("%s:%s:%d", aggregateType, aggregateID, seq)
        item, err := client.GetState(context.Background(), "event-store", key, nil)
        if err != nil || item == nil || len(item.Value) == 0 {
            break
        }
        var event Event
        json.Unmarshal(item.Value, &event)
        order = ApplyEvent(order, event)
    }

    return order, nil
}
```

## Taking Snapshots at the Right Time

Trigger snapshot creation after appending every N events:

```go
const SnapshotThreshold = 50

func AppendEventWithSnapshot(client dapr.Client, event Event, currentState Order) error {
    if err := AppendEvent(client, event); err != nil {
        return err
    }

    if event.Sequence%SnapshotThreshold == 0 {
        return SaveSnapshot(client,
            event.AggregateType,
            event.AggregateID,
            currentState,
            event.Sequence,
        )
    }
    return nil
}
```

## Schema Versioning for Snapshots

When event handlers change, existing snapshots may become invalid. Version snapshots to allow safe invalidation:

```go
key := fmt.Sprintf("%s:%s:v%d", aggregateType, aggregateID, schemaVersion)
```

When the schema version increments, old snapshots are ignored and the aggregate is rebuilt from full event history.

## Summary

Snapshots with Dapr state management bound aggregate load time regardless of event history length. By combining snapshot reads with selective event replay from the last snapshot sequence, you keep aggregates fast to load while maintaining the full audit trail of domain events.
