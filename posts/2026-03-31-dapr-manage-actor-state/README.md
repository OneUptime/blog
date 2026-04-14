# How to Manage Actor State in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, State Management, State Store, Persistence

Description: Learn how to read, write, delete, and transactionally update actor state in Dapr using the actor state manager across Go and Python SDKs.

---

Actor state in Dapr is key-value pairs that are automatically persisted to a configured state store and loaded when the actor activates. The actor state manager abstracts all storage operations behind a simple API.

## State Store Requirements

The state store component must have `actorStateStore` set to `true`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: actorStateStore
    value: "true"
```

## Reading State

```go
func (a *OrderActor) GetStatus(ctx context.Context) (*OrderStatus, error) {
  var status OrderStatus
  err := a.GetStateManager().Get(ctx, "status", &status)
  if err != nil {
    // Key does not exist yet
    return &OrderStatus{State: "pending"}, nil
  }
  return &status, nil
}
```

## Writing State

```go
func (a *OrderActor) UpdateStatus(ctx context.Context, req *UpdateStatusRequest) error {
  status := OrderStatus{
    State:     req.State,
    UpdatedAt: time.Now().UTC(),
  }
  return a.GetStateManager().Set(ctx, "status", status)
}
```

## Deleting State

```go
func (a *OrderActor) Cancel(ctx context.Context) error {
  // Remove specific state keys
  if err := a.GetStateManager().Remove(ctx, "status"); err != nil {
    return err
  }
  if err := a.GetStateManager().Remove(ctx, "items"); err != nil {
    return err
  }
  return nil
}
```

## Managing Multiple State Keys

```go
type OrderActor struct {
  actor.ServerImplBaseCtx
}

func (a *OrderActor) PlaceOrder(ctx context.Context, req *PlaceOrderRequest) error {
  sm := a.GetStateManager()

  // Write multiple keys
  if err := sm.Set(ctx, "items", req.Items); err != nil {
    return err
  }
  if err := sm.Set(ctx, "customerId", req.CustomerID); err != nil {
    return err
  }
  if err := sm.Set(ctx, "status", "confirmed"); err != nil {
    return err
  }
  return nil
}
```

## Transactional State Updates in Python

```python
from dapr.actor import Actor

class OrderActor(Actor):
    async def ship_order(self, tracking_number: str):
        # Atomically update both status and tracking
        await self._state_manager.set_state("status", "shipped")
        await self._state_manager.set_state("tracking", tracking_number)
        await self._state_manager.save_state()
```

## State Namespacing

Dapr automatically namespaces actor state by actor type and ID. The key `status` for actor `Order/order-001` is stored as a separate entry from `status` for `Order/order-002`. You do not need to include the actor ID in your state key names.

## Best Practices

- Use descriptive, stable key names - changing key names requires a migration strategy.
- Keep state values serializable to JSON; avoid non-serializable types.
- Remove stale state keys during actor cleanup to prevent unbounded state growth.
- Use small, focused state keys rather than one large JSON blob for better partial update efficiency.

## Summary

Dapr's actor state manager provides a straightforward API for reading, writing, and deleting state keys that are persisted to any compatible state store. State is automatically scoped by actor identity, eliminating key collision risks. Following best practices around key naming and cleanup ensures actor state remains efficient and maintainable at scale.
