# How to Implement Event Replay from Dapr Event Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event Sourcing, Event Replay, State Management, Architecture

Description: Implement event replay from a Dapr-backed event store to rebuild projections, fix bugs in event handlers, and bootstrap new services from historical event streams.

---

## Overview

Event replay is one of the most powerful capabilities of event sourcing. When you replay events from your event store, you can rebuild read models after schema changes, correct projection bugs by re-running updated handler logic, and bootstrap new services with historical data. Dapr's state management API provides the persistence layer; replay logic lives in your application code.

## When to Use Event Replay

- **Fix projection bugs**: A handler bug corrupted a read model - replay all events with the fixed handler to correct it.
- **Add new projections**: A new service needs historical data - replay from the beginning to build its initial state.
- **Audit and debugging**: Trace exactly what happened to an aggregate by replaying its event stream.
- **Schema migration**: Events need transformation - replay with a migration function applied to each event.

## Basic Replay from Sequence Start

```go
// replayer.go
package replay

import (
    "context"
    "encoding/json"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

type EventHandler func(event DomainEvent) error

func ReplayStream(
    ctx context.Context,
    client dapr.Client,
    aggregateType, aggregateID string,
    fromSeq int64,
    handler EventHandler,
) error {
    seq := fromSeq
    replayed := 0

    for {
        key := fmt.Sprintf("%s|%s|%010d", aggregateType, aggregateID, seq)
        item, err := client.GetState(ctx, "event-store", key, map[string]string{
            "consistency": "strong",
        })
        if err != nil || item == nil || len(item.Value) == 0 {
            break // end of stream
        }

        var event DomainEvent
        if err := json.Unmarshal(item.Value, &event); err != nil {
            return fmt.Errorf("unmarshal error at seq %d: %w", seq, err)
        }

        if err := handler(event); err != nil {
            return fmt.Errorf("handler error at seq %d: %w", seq, err)
        }

        seq++
        replayed++
    }

    fmt.Printf("Replayed %d events for %s/%s starting from seq %d\n",
        replayed, aggregateType, aggregateID, fromSeq)
    return nil
}
```

## Replaying All Aggregates of a Type

For full projection rebuilds, you need to replay events across all aggregate instances. Use a cursor stored in state to track progress:

```go
func ReplayAllAggregates(
    ctx context.Context,
    client dapr.Client,
    aggregateType string,
    aggregateIDs []string,
    handler EventHandler,
) error {
    for _, aggID := range aggregateIDs {
        if err := ReplayStream(ctx, client, aggregateType, aggID, 1, handler); err != nil {
            return fmt.Errorf("failed replaying %s/%s: %w", aggregateType, aggID, err)
        }
    }
    return nil
}
```

## Tracking Replay Progress

Save a checkpoint so replay can resume from where it left off if interrupted:

```go
type ReplayCheckpoint struct {
    AggregateType string `json:"aggregateType"`
    AggregateID   string `json:"aggregateId"`
    LastSequence  int64  `json:"lastSequence"`
    ProjectionID  string `json:"projectionId"`
}

func SaveCheckpoint(ctx context.Context, client dapr.Client, cp ReplayCheckpoint) error {
    key := fmt.Sprintf("replay-checkpoint|%s|%s|%s",
        cp.ProjectionID, cp.AggregateType, cp.AggregateID)
    data, err := json.Marshal(cp)
    if err != nil {
        return fmt.Errorf("marshal checkpoint: %w", err)
    }
    return client.SaveState(ctx, "statestore", key, data, nil)
}

func LoadCheckpoint(ctx context.Context, client dapr.Client, projectionID, aggregateType, aggregateID string) (int64, error) {
    key := fmt.Sprintf("replay-checkpoint|%s|%s|%s", projectionID, aggregateType, aggregateID)
    item, err := client.GetState(ctx, "statestore", key, nil)
    if err != nil || item == nil || len(item.Value) == 0 {
        return 1, nil // start from beginning
    }
    var cp ReplayCheckpoint
    if err := json.Unmarshal(item.Value, &cp); err != nil {
        return 0, fmt.Errorf("unmarshal checkpoint: %w", err)
    }
    return cp.LastSequence + 1, nil
}
```

## Running a Full Replay with Checkpointing

```go
func RebuildProjection(ctx context.Context, client dapr.Client, projectionID string, aggregateIDs []string) error {
    handler := func(event DomainEvent) error {
        // Apply event to projection (e.g., update a read model database)
        if err := applyToProjection(projectionID, event); err != nil {
            return err
        }

        // Save checkpoint after each event
        return SaveCheckpoint(ctx, client, ReplayCheckpoint{
            ProjectionID:  projectionID,
            AggregateType: event.AggregateType,
            AggregateID:   event.AggregateID,
            LastSequence:  event.Sequence,
        })
    }

    for _, aggID := range aggregateIDs {
        fromSeq, err := LoadCheckpoint(ctx, client, projectionID, "Order", aggID)
        if err != nil {
            return err
        }
        if err := ReplayStream(ctx, client, "Order", aggID, fromSeq, handler); err != nil {
            return err
        }
    }
    return nil
}
```

## Summary

Event replay from a Dapr event store enables rebuilding projections, bootstrapping new services, and correcting handler bugs by re-processing historical events. Using sequential keys in the state store provides a natural cursor for traversal, while checkpoint state keys allow interrupted replays to resume safely. This pattern unlocks the full benefit of event sourcing - your system state is always derivable from the event stream.
