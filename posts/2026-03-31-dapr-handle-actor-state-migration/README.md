# How to Handle Actor State Migration in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, State Migration, Schema Evolution, Versioning

Description: Handle actor state schema migrations in Dapr when evolving actor state structures, using versioned snapshots and backward-compatible migration strategies.

---

## Overview

Actor state schemas evolve as your application grows. Migrating actor state without downtime requires versioned state structures, backward-compatible reads, and progressive migration strategies.

## Versioned State Schema

Always include a version field in your actor state:

```go
package main

import (
    "context"
    "encoding/json"
    "github.com/dapr/go-sdk/actor"
)

// Version 1 - original state
type OrderStateV1 struct {
    Status string `json:"status"`
    Amount int    `json:"amount"`
}

// Version 2 - added currency and customer info
type OrderStateV2 struct {
    Status     string  `json:"status"`
    Amount     float64 `json:"amount"`     // Changed from int
    Currency   string  `json:"currency"`   // New field
    CustomerID string  `json:"customerId"` // New field
}

// Wrapper with version marker
type VersionedState struct {
    Version int             `json:"version"`
    Data    json.RawMessage `json:"data"`
}
```

## Migration Logic with Lazy Initialization

The Dapr Go SDK does not provide a user-overridable activation lifecycle hook (unlike the .NET SDK's `OnActivateAsync`). Instead, use a lazy-initialization helper that each actor method calls before accessing state:

```go
type OrderActor struct {
    actor.ServerImplBaseCtx
    state   OrderStateV2
    version int
    loaded  bool
}

func (a *OrderActor) ensureStateLoaded(ctx context.Context) error {
    if a.loaded {
        return nil // already loaded and migrated
    }

    var versioned VersionedState
    err := a.GetStateManager().Get(ctx, "state", &versioned)
    if err != nil {
        // No state yet - initialize fresh
        a.state = OrderStateV2{Currency: "USD"}
        a.version = 2
        a.loaded = true
        return nil
    }

    switch versioned.Version {
    case 1:
        var v1 OrderStateV1
        json.Unmarshal(versioned.Data, &v1)
        a.state = a.migrateV1ToV2(v1)
        a.version = 2
        a.loaded = true
        // Save migrated state immediately
        return a.saveState(ctx)
    case 2:
        json.Unmarshal(versioned.Data, &a.state)
        a.version = 2
        a.loaded = true
    default:
        return fmt.Errorf("unknown state version: %d", versioned.Version)
    }
    return nil
}

func (a *OrderActor) migrateV1ToV2(v1 OrderStateV1) OrderStateV2 {
    return OrderStateV2{
        Status:     v1.Status,
        Amount:     float64(v1.Amount),
        Currency:   "USD",       // Default for existing data
        CustomerID: "unknown",   // Will be updated on next interaction
    }
}

func (a *OrderActor) saveState(ctx context.Context) error {
    data, _ := json.Marshal(a.state)
    return a.GetStateManager().Set(ctx, "state", VersionedState{
        Version: a.version,
        Data:    data,
    })
}
```

## Progressive Migration Strategy

For large actor fleets, migrate on access rather than all at once:

```go
func (a *OrderActor) GetOrder(ctx context.Context) (*OrderStateV2, error) {
    if err := a.ensureStateLoaded(ctx); err != nil {
        return nil, err
    }
    return &a.state, nil
}

func (a *OrderActor) UpdateOrder(ctx context.Context, update OrderUpdate) error {
    if err := a.ensureStateLoaded(ctx); err != nil {
        return err
    }
    a.state.Status = update.Status
    return a.saveState(ctx) // Saves as V2
}
```

## Bulk Migration Script

For planned migrations, use a background migrator:

```go
func migrateAllActors(actorIDs []string) {
    for _, id := range actorIDs {
        // Invoke a migration method on each actor
        url := fmt.Sprintf(
            "http://localhost:3500/v1.0/actors/OrderActor/%s/method/Migrate",
            id,
        )
        resp, _ := http.Post(url, "application/json",
            strings.NewReader(`{"targetVersion": 2}`))
        resp.Body.Close()
        time.Sleep(10 * time.Millisecond) // Rate limit
    }
}
```

## Backward-Compatible Field Additions

For additive changes (new optional fields), use `omitempty` to allow V1 readers to ignore new fields:

```go
type OrderStateV2 struct {
    Status     string  `json:"status"`
    Amount     float64 `json:"amount"`
    Currency   string  `json:"currency,omitempty"`   // Safe to add
    CustomerID string  `json:"customerId,omitempty"` // Safe to add
}
```

## Testing State Migration

```go
func TestMigrateV1ToV2(t *testing.T) {
    actor := &OrderActor{}
    v1 := OrderStateV1{Status: "paid", Amount: 100}
    v2 := actor.migrateV1ToV2(v1)

    if v2.Status != "paid" {
        t.Errorf("expected status paid, got %s", v2.Status)
    }
    if v2.Amount != 100.0 {
        t.Errorf("expected amount 100.0, got %f", v2.Amount)
    }
    if v2.Currency != "USD" {
        t.Errorf("expected USD default currency, got %s", v2.Currency)
    }
}
```

## Summary

Actor state migration in Dapr requires versioned state wrappers with migration logic in a lazy-initialization helper (since the Go SDK does not expose an activation lifecycle hook). Migrate on first access for zero-downtime schema evolution, save migrated state immediately to avoid re-migrating on every activation, and use background migrators for bulk updates. Always test migration logic independently and use `omitempty` for backward-compatible additive changes.
