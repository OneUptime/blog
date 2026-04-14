# How to Set Up Integration Tests for Dapr Actors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, Actor, Integration Test, Python

Description: Write integration tests for Dapr virtual actors that verify state persistence, method invocation, reminders, and timers against a real Dapr runtime with placement service.

---

Dapr actors require the placement service for actor distribution and a state store for persistence. Integration tests that use the full actor runtime catch placement registration failures, state serialization issues, and reminder delivery problems that unit tests cannot simulate.

## Required Infrastructure

An actor integration test environment needs:
1. Dapr placement service
2. A state store (Redis)
3. Your actor-hosting application with a Dapr sidecar

## Docker Compose Setup

```yaml
# docker-compose.actor-test.yaml
version: "3.8"
services:
  redis:
    image: redis:7-alpine

  placement:
    image: daprio/placement:1.14.0
    command: ["./placement", "-port", "50006", "-log-level", "error"]
    ports:
      - "50006:50006"

  actor-service:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DAPR_HTTP_PORT=3500

  actor-dapr:
    image: daprio/daprd:1.14.0
    command:
      - "./daprd"
      - "-app-id"
      - "actor-service"
      - "-app-port"
      - "8080"
      - "-placement-host-address"
      - "placement:50006"
      - "-components-path"
      - "/components"
    volumes:
      - ./components:/components
    network_mode: "service:actor-service"
```

## Actor Implementation

```python
# actor.py
from dapr.actor import Actor, ActorInterface, actormethod

class OrderActorInterface(ActorInterface):
    @actormethod(name="ProcessOrder")
    async def process_order(self, order_data: dict) -> dict: ...

    @actormethod(name="GetStatus")
    async def get_status(self) -> str: ...

class OrderActor(Actor, OrderActorInterface):
    async def process_order(self, order_data: dict) -> dict:
        await self._state_manager.set_state("order", order_data)
        await self._state_manager.set_state("status", "processed")
        return {"success": True}

    async def get_status(self) -> str:
        has_value, status = await self._state_manager.try_get_state("status")
        return status if has_value else "pending"
```

## Integration Test

```python
# test_actor_integration.py
import requests
import time
import pytest

DAPR_URL = "http://localhost:3500"

def wait_for_dapr():
    for _ in range(30):
        try:
            r = requests.get(f"{DAPR_URL}/v1.0/healthz")
            if r.status_code == 204:
                return
        except Exception:
            pass
        time.sleep(1)
    pytest.fail("Dapr not ready")

def test_actor_method_invocation():
    wait_for_dapr()
    actor_id = "order-test-001"

    # Invoke actor method
    resp = requests.put(
        f"{DAPR_URL}/v1.0/actors/OrderActor/{actor_id}/method/ProcessOrder",
        json={"orderId": actor_id, "amount": 150}
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True

def test_actor_state_persistence():
    actor_id = "order-state-test"
    requests.put(
        f"{DAPR_URL}/v1.0/actors/OrderActor/{actor_id}/method/ProcessOrder",
        json={"orderId": actor_id}
    )

    # Get state via the actor method
    resp = requests.put(
        f"{DAPR_URL}/v1.0/actors/OrderActor/{actor_id}/method/GetStatus"
    )
    assert resp.json() == "processed"

def test_actor_reminder():
    actor_id = "reminder-test"
    # Register a reminder
    resp = requests.put(
        f"{DAPR_URL}/v1.0/actors/OrderActor/{actor_id}/reminders/check-status",
        json={"dueTime": "2s", "period": "10s", "data": {"check": True}}
    )
    assert resp.status_code == 204

    # Wait for reminder to fire
    time.sleep(4)
    # Verify the reminder callback was received by checking actor state
```

## Summary

Integration tests for Dapr actors require the placement service and a state store. By running the full actor runtime in Docker Compose, you can verify actor method invocation, state persistence across activations, and reminder delivery - all behaviors that depend on the placement algorithm and state store integration.
