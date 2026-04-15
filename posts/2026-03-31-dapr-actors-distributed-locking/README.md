# How to Use Dapr Actors for Distributed Locking Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Distributed Lock, Concurrency, Coordination

Description: Implement distributed locking patterns using Dapr actors as lock managers, providing named locks with TTL, tryLock semantics, and automatic release on actor deactivation.

---

Dapr provides a dedicated Distributed Lock API, but actors can also serve as lock managers for scenarios that need more complex locking semantics like reentrant locks, lock queues, or coordinated resource access.

## Why Use Actors as Lock Managers

- Turn-based concurrency makes lock state updates race-condition-free
- Actor idle timeout provides automatic lock expiry
- Lock history and audit trails are easy to maintain in actor state
- No external infrastructure beyond the state store

## Lock Actor Implementation

```go
package main

import (
  "context"
  "fmt"
  "time"
  "github.com/dapr/go-sdk/actor"
)

type LockState struct {
  ResourceID string    `json:"resourceId"`
  OwnerID    string    `json:"ownerId"`
  AcquiredAt time.Time `json:"acquiredAt"`
  ExpiresAt  time.Time `json:"expiresAt"`
  IsLocked   bool      `json:"isLocked"`
}

type LockActor struct {
  actor.ServerImplBaseCtx
}

func (a *LockActor) Type() string { return "Lock" }

func (a *LockActor) TryAcquire(ctx context.Context, req *AcquireRequest) (*AcquireResponse, error) {
  var state LockState
  a.GetStateManager().Get(ctx, "lock", &state)

  now := time.Now().UTC()

  // Check if lock is held and not expired
  if state.IsLocked && now.Before(state.ExpiresAt) {
    if state.OwnerID == req.OwnerID {
      // Reentrant: same owner extends the lock
      state.ExpiresAt = now.Add(req.TTL)
      a.GetStateManager().Set(ctx, "lock", state)
      return &AcquireResponse{Acquired: true, ExpiresAt: state.ExpiresAt}, nil
    }
    return &AcquireResponse{
      Acquired: false,
      HeldBy:   state.OwnerID,
      ExpiresAt: state.ExpiresAt,
    }, nil
  }

  // Lock is free or expired - acquire it
  state = LockState{
    ResourceID: a.ID(),
    OwnerID:    req.OwnerID,
    AcquiredAt: now,
    ExpiresAt:  now.Add(req.TTL),
    IsLocked:   true,
  }
  a.GetStateManager().Set(ctx, "lock", state)

  return &AcquireResponse{Acquired: true, ExpiresAt: state.ExpiresAt}, nil
}

func (a *LockActor) Release(ctx context.Context, req *ReleaseRequest) error {
  var state LockState
  if err := a.GetStateManager().Get(ctx, "lock", &state); err != nil {
    return nil // Lock does not exist, nothing to release
  }

  if state.OwnerID != req.OwnerID {
    return fmt.Errorf("lock is held by %s, not %s", state.OwnerID, req.OwnerID)
  }

  state.IsLocked = false
  return a.GetStateManager().Set(ctx, "lock", state)
}

func (a *LockActor) GetStatus(ctx context.Context) (*LockState, error) {
  var state LockState
  a.GetStateManager().Get(ctx, "lock", &state)
  return &state, nil
}

type AcquireRequest struct {
  OwnerID string        `json:"ownerId"`
  TTL     time.Duration `json:"ttl"`
}

type AcquireResponse struct {
  Acquired  bool      `json:"acquired"`
  HeldBy    string    `json:"heldBy,omitempty"`
  ExpiresAt time.Time `json:"expiresAt"`
}

type ReleaseRequest struct {
  OwnerID string `json:"ownerId"`
}
```

## Using the Lock Actor

```bash
# Acquire a lock on resource "file-001"
curl -X POST http://localhost:3500/v1.0/actors/Lock/file-001/method/TryAcquire \
  -H "Content-Type: application/json" \
  -d '{"ownerId": "worker-001", "ttl": 30000000000}'

# Response: {"acquired": true, "expiresAt": "2026-03-31T14:05:30Z"}

# Release the lock
curl -X POST http://localhost:3500/v1.0/actors/Lock/file-001/method/Release \
  -H "Content-Type: application/json" \
  -d '{"ownerId": "worker-001"}'
```

## Using the Lock in Application Code

```go
func processFileWithLock(ctx context.Context, client dapr.Client, fileID, workerID string) error {
  // Try to acquire lock
  resp, err := client.InvokeActor(ctx, &dapr.InvokeActorRequest{
    ActorType: "Lock",
    ActorID:   fileID,
    Method:    "TryAcquire",
    Data:      mustMarshal(AcquireRequest{OwnerID: workerID, TTL: 30 * time.Second}),
  })
  if err != nil {
    return err
  }

  var result AcquireResponse
  json.Unmarshal(resp.Data, &result)

  if !result.Acquired {
    return fmt.Errorf("resource locked by %s until %v", result.HeldBy, result.ExpiresAt)
  }

  defer func() {
    client.InvokeActor(ctx, &dapr.InvokeActorRequest{
      ActorType: "Lock",
      ActorID:   fileID,
      Method:    "Release",
      Data:      mustMarshal(ReleaseRequest{OwnerID: workerID}),
    })
  }()

  return processFile(ctx, fileID)
}
```

## Summary

Dapr actors implement distributed locking patterns cleanly through turn-based concurrency - the lock state itself never suffers from race conditions. By modeling each lockable resource as an actor, you get built-in TTL expiry via actor idle timeout and a natural place to store lock history. This approach is more flexible than the Dapr Lock API for use cases requiring reentrant locks or auditable lock ownership tracking.
