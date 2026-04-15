# How to Handle Actor Activation and Deactivation in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Lifecycle, Activation, Deactivation

Description: Learn how Dapr actor activation and deactivation lifecycle hooks work, and how to use them for initialization, cleanup, and resource management.

---

Dapr actors have a well-defined lifecycle. Understanding activation and deactivation lets you write clean initialization and teardown logic, manage external connections, and prevent resource leaks.

## The Actor Lifecycle

1. **Activation** - Triggered on the first method call to an actor ID, or when the actor is rebalanced to a new host instance.
2. **Active** - The actor processes method calls sequentially (turn-based concurrency).
3. **Deactivation** - Triggered after the actor has been idle for longer than `actorIdleTimeout`, or when the host shuts down.

## Implementing OnActivate in Go

```go
package main

import (
  "context"
  "log"

  "github.com/dapr/go-sdk/actor"
)

type DeviceActor struct {
  actor.ServerImplBaseCtx
  deviceID    string
  initialized bool
}

func (a *DeviceActor) OnActivate() error {
  log.Printf("Actor %s activating", a.ID())

  // Load initial state if it exists
  var config DeviceConfig
  if err := a.GetStateManager().Get(context.Background(), "config", &config); err == nil {
    a.deviceID = config.DeviceID
    a.initialized = true
    log.Printf("Restored config for device %s", a.deviceID)
  } else {
    log.Printf("No existing config, starting fresh")
  }

  return nil
}
```

## Implementing OnDeactivate in Go

```go
func (a *DeviceActor) OnDeactivate() error {
  log.Printf("Actor %s deactivating, saving final state", a.ID())

  // Save any in-memory state to the state store before shutdown
  snapshot := DeviceSnapshot{
    LastSeen:  time.Now().UTC(),
    IsOnline:  false,
    DeviceID:  a.deviceID,
  }

  return a.GetStateManager().Set(context.Background(), "snapshot", snapshot)
}
```

## Python SDK Lifecycle Hooks

```python
from dapr.actor import Actor

class DeviceActor(Actor):
    async def _on_activate(self):
        print(f"Actor {self.id.id} activated")
        # Initialize in-memory cache from state store
        has_value, val = await self._state_manager.try_get_state("config")
        if has_value:
            self._config = val
        else:
            self._config = {}

    async def _on_deactivate(self):
        print(f"Actor {self.id.id} deactivating")
        # Flush any buffered state
        await self._state_manager.save_state()
```

## Graceful Shutdown During Rebalancing

When Dapr rebalances actors (e.g., during a rolling deployment), deactivation is called on the old host before the actor is activated on the new host. Use `drainOngoingCallTimeout` to ensure in-flight calls complete:

```json
{
  "actorIdleTimeout": "1h",
  "drainOngoingCallTimeout": "15s",
  "drainRebalancedActors": true
}
```

## Common Patterns

**External Resource Cleanup:**

```go
func (a *ConnectionActor) OnDeactivate() error {
  if a.conn != nil {
    a.conn.Close()
    a.conn = nil
  }
  return nil
}
```

**Metrics on Activation:**

```go
func (a *OrderActor) OnActivate() error {
  metrics.Counter("actor.activations", map[string]string{
    "actor_type": "Order",
  }).Inc()
  return nil
}
```

## Summary

Dapr actor activation and deactivation hooks provide clean lifecycle management for stateful services. Use `OnActivate` to restore in-memory state from persistent storage and initialize resources, and `OnDeactivate` to flush buffers and close connections cleanly. Pairing lifecycle hooks with proper drain settings ensures no data is lost during deployments or host failures.
