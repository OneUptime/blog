# How to Run Dapr Quickstart for Actors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Quickstart, Virtual Actor, Stateful

Description: Run the Dapr actors quickstart to create a virtual actor with state and timers, invoke actor methods, and understand single-threaded actor execution guarantees.

---

## What You Will Build

A `SmartDevice` actor that tracks a device's on/off state and data. Each device ID gets its own isolated actor instance. Multiple replicas of the service can run concurrently, but only one instance of `SmartDevice/device-1` is active at a time.

```mermaid
flowchart LR
    Client[Client App] -->|PUT /v1.0/actors/SmartDevice/device-1/method/TurnOn| SA[Sidecar A]
    SA -->|lookup placement table| Placement[Placement Service]
    Placement -->|device-1 is on pod-2| SA
    SA -->|forward to pod-2 sidecar| SB[Sidecar B]
    SB -->|PUT /actors/SmartDevice/device-1/method/TurnOn| ActorHost[Actor Host App]
```

## Prerequisites

```bash
dapr init
```

The default state store must have `actorStateStore: "true"`:

```yaml
# ~/.dapr/components/statestore.yaml
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: actorStateStore
    value: "true"
```

## Actor Host Application

```python
# actor-host/app.py
from dapr.actor import Actor, ActorInterface, actormethod
from dapr.actor.runtime.runtime import ActorRuntime
from dapr.actor.runtime.config import ActorRuntimeConfig
from dapr.ext.fastapi import DaprActor
from fastapi import FastAPI
import uvicorn

app = FastAPI()
dapr_actor = DaprActor(app)

class SmartDeviceInterface(ActorInterface):
    @actormethod(name="TurnOn")
    async def turn_on(self) -> None: ...

    @actormethod(name="TurnOff")
    async def turn_off(self) -> None: ...

    @actormethod(name="GetStatus")
    async def get_status(self) -> dict: ...

class SmartDeviceActor(Actor, SmartDeviceInterface):
    def __init__(self, ctx, actor_id):
        super().__init__(ctx, actor_id)

    async def turn_on(self):
        await self._state_manager.set_state("status", "on")
        await self._state_manager.save_state()
        print(f"Device {self.id.id} turned ON")

    async def turn_off(self):
        await self._state_manager.set_state("status", "off")
        await self._state_manager.save_state()
        print(f"Device {self.id.id} turned OFF")

    async def get_status(self) -> dict:
        has_value, val = await self._state_manager.try_get_state("status")
        return {"deviceId": self.id.id, "status": val if has_value else "unknown"}

@app.on_event("startup")
async def startup():
    config = ActorRuntimeConfig()
    ActorRuntime.set_actor_config(config)
    await ActorRuntime.register_actor(SmartDeviceActor)

if __name__ == '__main__':
    uvicorn.run(app, port=5001)
```

## Run the Actor Host

```bash
pip3 install dapr dapr-ext-fastapi fastapi uvicorn
dapr run \
  --app-id smart-device-host \
  --app-port 5001 \
  --dapr-http-port 3500 \
  -- uvicorn app:app --port 5001
```

## Invoke Actor Methods from a Client

```bash
# Turn on device-1
curl -X PUT http://localhost:3500/v1.0/actors/SmartDevice/device-1/method/TurnOn \
  -H "Content-Type: application/json" \
  -d '{}'

# Get device-1 status
curl -X PUT http://localhost:3500/v1.0/actors/SmartDevice/device-1/method/GetStatus \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response:

```json
{"deviceId": "device-1", "status": "on"}
```

## Actor Reminders (Persistent)

```bash
# Set a reminder to check device status every hour
curl -X POST \
  "http://localhost:3500/v1.0/actors/SmartDevice/device-1/reminders/hourly-check" \
  -H "Content-Type: application/json" \
  -d '{
    "dueTime": "0h0m30s0ms",
    "period": "1h"
  }'
```

Your actor must implement a `receive_reminder` method (or handler endpoint) to process reminders.

## Actor Timers (Non-Persistent)

```bash
# Set a 5-second timer
curl -X POST \
  "http://localhost:3500/v1.0/actors/SmartDevice/device-1/timers/ping" \
  -H "Content-Type: application/json" \
  -d '{
    "dueTime": "5s",
    "period": "10s",
    "callback": "ping"
  }'
```

## Actor State

Actor state is automatically associated with the actor instance ID:

```bash
# Read actor state directly (useful for debugging)
curl http://localhost:3500/v1.0/actors/SmartDevice/device-1/state/status
```

## Key Actor Concepts

```mermaid
flowchart TD
    A[Virtual Actor\nSmartDevice/device-1] --> B[Single-threaded\nexecution]
    A --> C[Persistent state\nauto-saved to store]
    A --> D[Reminders\nsurvive restarts]
    A --> E[Timers\nlose on deactivation]
    A --> F[Auto-activation\non first call]
    A --> G[Auto-deactivation\nafter idle timeout]
```

## Dapr Config Endpoint

Your actor host app must expose `/dapr/config` to declare actor types. When using `dapr-ext-fastapi`, the `DaprActor` extension registers this endpoint automatically based on actors registered with `ActorRuntime.register_actor`. The response looks like:

```json
{
    "entities": ["SmartDevice"],
    "actorIdleTimeout": "1h0m0s0ms",
    "actorScanInterval": "0h0m30s0ms"
}
```

## Summary

The Dapr actors quickstart demonstrates creating a virtual actor with persistent state and single-threaded execution guarantees. Each device ID maps to exactly one active `SmartDevice` actor instance across all replicas. The Placement service routes method calls to the correct host. Reminders persist actor callbacks across restarts while timers are non-persistent. State is automatically saved to the configured actor state store.
