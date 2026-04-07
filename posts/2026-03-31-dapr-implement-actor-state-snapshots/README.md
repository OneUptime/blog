# How to Implement Actor State Snapshots in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, State, Snapshot, Performance

Description: Implement actor state snapshots in Dapr to reduce state store read overhead on activation and speed up actor hydration for actors with large state histories.

---

## Overview

Dapr actors persist state as individual key-value pairs. For actors with many state fields, activation requires multiple state store reads. Snapshots aggregate all actor state into a single key, enabling faster activation at the cost of snapshot maintenance.

## Standard Actor State Operations

Without snapshots, each field is stored and read independently:

```go
package main

import (
    "context"
    "github.com/dapr/go-sdk/actor"
    "encoding/json"
)

type OrderState struct {
    Status     string   `json:"status"`
    Items      []Item   `json:"items"`
    TotalPrice float64  `json:"totalPrice"`
    CustomerID string   `json:"customerId"`
    CreatedAt  string   `json:"createdAt"`
}

type OrderActor struct {
    actor.ServerImplBaseCtx
}

func (a *OrderActor) Type() string { return "OrderActor" }

func (a *OrderActor) GetOrder(ctx context.Context) (*OrderState, error) {
    var state OrderState
    // Multiple reads - one per field without snapshots
    if err := a.GetStateManager().Get(ctx, "status", &state.Status); err != nil {
        return nil, err
    }
    if err := a.GetStateManager().Get(ctx, "items", &state.Items); err != nil {
        return nil, err
    }
    return &state, nil
}
```

## Implementing Snapshots

Use a single composite key for the full state:

```go
const snapshotKey = "snapshot"

type OrderActor struct {
    actor.ServerImplBaseCtx
    state    *OrderState
    isDirty  bool
}

func (a *OrderActor) OnActivate(ctx context.Context) error {
    // Load snapshot on activation (single read)
    var snapshot OrderState
    err := a.GetStateManager().Get(ctx, snapshotKey, &snapshot)
    if err != nil && !isNotFound(err) {
        return err
    }
    if err == nil {
        a.state = &snapshot
    } else {
        a.state = &OrderState{Status: "new"}
    }
    return nil
}

func (a *OrderActor) UpdateStatus(ctx context.Context, newStatus string) error {
    a.state.Status = newStatus
    a.isDirty = true
    return a.saveSnapshot(ctx)
}

func (a *OrderActor) saveSnapshot(ctx context.Context) error {
    if !a.isDirty {
        return nil
    }
    err := a.GetStateManager().Set(ctx, snapshotKey, a.state)
    if err != nil {
        return err
    }
    a.isDirty = false
    return nil
}

func (a *OrderActor) OnDeactivate() error {
    if a.isDirty {
        ctx := context.Background()
        return a.saveSnapshot(ctx)
    }
    return nil
}
```

## Periodic Snapshot with Timers

Save snapshots on a schedule to avoid losing state on sudden termination:

```go
func (a *OrderActor) RegisterSnapshotTimer(ctx context.Context) error {
    return a.RegisterActorTimer(ctx, &actor.RegisterTimerRequest{
        ActorType: a.Type(),
        ActorID:   a.ID(),
        Name:      "snapshot-timer",
        DueTime:   "1m",
        Period:    "1m",
        CallBack:  "SaveSnapshot",
    })
}

func (a *OrderActor) SaveSnapshot(ctx context.Context) error {
    return a.saveSnapshot(ctx)
}
```

## Snapshot Versioning for Schema Migration

```go
type VersionedSnapshot struct {
    Version int             `json:"version"`
    Data    json.RawMessage `json:"data"`
}

func (a *OrderActor) loadVersionedSnapshot(ctx context.Context) error {
    var snap VersionedSnapshot
    if err := a.GetStateManager().Get(ctx, snapshotKey, &snap); err != nil {
        return err
    }

    switch snap.Version {
    case 1:
        var v1State OrderStateV1
        json.Unmarshal(snap.Data, &v1State)
        a.state = migrateV1ToV2(v1State)
    case 2:
        json.Unmarshal(snap.Data, &a.state)
    }
    return nil
}
```

## Benchmarking Snapshot vs. Field-by-Field

```go
func BenchmarkActivation(b *testing.B) {
    // Measure time for actor activation with snapshot
    for i := 0; i < b.N; i++ {
        actor := NewOrderActorWithSnapshot()
        actor.OnActivate(context.Background())
    }
}
```

## Summary

Actor state snapshots reduce activation time from N state store reads (one per field) to a single read by aggregating all state into one composite key. Implement `OnActivate` to load the snapshot, save on every mutation for strong durability, or use a Dapr timer for periodic saves as a performance trade-off. Add version fields to snapshots to support schema migrations as your actor evolves.
