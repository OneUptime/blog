# How to Implement Actor Event Sourcing in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Event Sourcing, State, Pattern

Description: Implement event sourcing patterns with Dapr actors to maintain a full audit log of state changes and enable deterministic state reconstruction from events.

---

## Overview

Event sourcing stores state changes as an immutable sequence of events rather than current state. Dapr actors are well-suited for this pattern because their single-threaded execution model prevents concurrent event appends, eliminating the need for optimistic locking.

## Event Sourcing Data Model

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "time"
    "github.com/dapr/go-sdk/actor"
)

type EventType string

const (
    OrderCreated  EventType = "OrderCreated"
    ItemAdded     EventType = "ItemAdded"
    OrderPaid     EventType = "OrderPaid"
    OrderShipped  EventType = "OrderShipped"
)

type DomainEvent struct {
    EventID   string    `json:"eventId"`
    EventType EventType `json:"eventType"`
    Timestamp string    `json:"timestamp"`
    Data      json.RawMessage `json:"data"`
    Version   int       `json:"version"`
}

type OrderState struct {
    OrderID    string  `json:"orderId"`
    Status     string  `json:"status"`
    Items      []Item  `json:"items"`
    TotalPrice float64 `json:"totalPrice"`
}
```

## Actor with Event Log

```go
type OrderActor struct {
    actor.ServerImplBaseCtx
    state    OrderState
    version  int
}

func (a *OrderActor) Type() string { return "OrderActor" }

func (a *OrderActor) appendEvent(ctx context.Context, eventType EventType, data interface{}) error {
    a.version++
    payload, _ := json.Marshal(data)

    event := DomainEvent{
        EventID:   fmt.Sprintf("%s-%d", a.ID(), a.version),
        EventType: eventType,
        Timestamp: time.Now().UTC().Format(time.RFC3339),
        Data:      payload,
        Version:   a.version,
    }

    // Store individual event
    key := fmt.Sprintf("event-%d", a.version)
    return a.GetStateManager().Set(ctx, key, event)
}

func (a *OrderActor) CreateOrder(ctx context.Context, input CreateOrderInput) error {
    if err := a.ensureStateLoaded(ctx); err != nil {
        return err
    }
    data := map[string]any{
        "customerId": input.CustomerID,
        "items":      input.Items,
    }
    if err := a.appendEvent(ctx, OrderCreated, data); err != nil {
        return err
    }
    // Apply event to in-memory state
    a.state.Status = "created"
    a.state.Items = input.Items
    a.saveCurrentVersion(ctx)
    return nil
}

func (a *OrderActor) PayOrder(ctx context.Context, paymentID string) error {
    if err := a.ensureStateLoaded(ctx); err != nil {
        return err
    }
    if err := a.appendEvent(ctx, OrderPaid, map[string]string{
        "paymentId": paymentID,
    }); err != nil {
        return err
    }
    a.state.Status = "paid"
    a.saveCurrentVersion(ctx)
    return nil
}

func (a *OrderActor) saveCurrentVersion(ctx context.Context) {
    a.GetStateManager().Set(ctx, "current-version", a.version)
}
```

## Replaying Events to Reconstruct State

The Dapr Go SDK does not provide a user-overridable activation lifecycle hook, so state must be loaded on demand. Use a lazy-initialization helper that each actor method calls before accessing state:

```go
func (a *OrderActor) ensureStateLoaded(ctx context.Context) error {
    if a.version > 0 {
        return nil // already loaded
    }
    // Load current version number
    var currentVersion int
    a.GetStateManager().Get(ctx, "current-version", &currentVersion)

    // Replay all events
    for i := 1; i <= currentVersion; i++ {
        var event DomainEvent
        key := fmt.Sprintf("event-%d", i)
        if err := a.GetStateManager().Get(ctx, key, &event); err != nil {
            return err
        }
        a.applyEvent(event)
    }
    a.version = currentVersion
    return nil
}

func (a *OrderActor) applyEvent(event DomainEvent) {
    switch event.EventType {
    case OrderCreated:
        var data struct {
            Items []Item `json:"items"`
        }
        json.Unmarshal(event.Data, &data)
        a.state.Items = data.Items
        a.state.Status = "created"
    case OrderPaid:
        a.state.Status = "paid"
    case OrderShipped:
        a.state.Status = "shipped"
    }
}
```

## Querying Event History

```go
func (a *OrderActor) GetEventHistory(ctx context.Context) ([]DomainEvent, error) {
    if err := a.ensureStateLoaded(ctx); err != nil {
        return nil, err
    }
    events := make([]DomainEvent, 0, a.version)
    for i := 1; i <= a.version; i++ {
        var event DomainEvent
        a.GetStateManager().Get(ctx, fmt.Sprintf("event-%d", i), &event)
        events = append(events, event)
    }
    return events, nil
}
```

## Snapshotting for Performance

For actors with thousands of events, combine snapshots with event sourcing:

```go
func (a *OrderActor) saveSnapshot(ctx context.Context) error {
    snapshot := map[string]any{
        "state":   a.state,
        "version": a.version,
    }
    return a.GetStateManager().Set(ctx, "snapshot", snapshot)
}
```

On activation, load the snapshot first and only replay events after the snapshot version.

## Summary

Dapr actors are natural fits for event sourcing because their turn-based concurrency eliminates concurrent write conflicts. Append domain events as individual state keys, replay them on activation to reconstruct current state, and add periodic snapshots for actors with long event histories. Event sourcing provides a full audit trail and enables time-travel debugging by replaying events to any past state.
