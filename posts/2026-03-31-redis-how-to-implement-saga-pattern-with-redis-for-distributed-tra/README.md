# How to Implement Saga Pattern with Redis for Distributed Transactions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Saga Pattern, Distributed Transaction, Microservice, Stream

Description: Implement the Saga pattern for distributed transactions using Redis Streams to coordinate multi-step operations with compensating actions on failure.

---

## Overview

In microservices, a single business operation often spans multiple services (create order, charge payment, update inventory, send email). Traditional ACID transactions do not work across services. The Saga pattern breaks the transaction into a sequence of local transactions, with compensating transactions to undo previous steps if a later step fails.

## Saga Types

- **Choreography**: Each service publishes events; the next service listens and reacts
- **Orchestration**: A central coordinator (the saga orchestrator) tells each service what to do

This guide implements orchestration with Redis Streams.

## Saga State Machine

```python
from enum import Enum
import json
import time
import uuid
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

class SagaStatus(str, Enum):
    STARTED = "started"
    STEP_COMPLETED = "step_completed"
    STEP_FAILED = "step_failed"
    COMPENSATING = "compensating"
    COMPLETED = "completed"
    FAILED = "failed"

class OrderSaga:
    """Orchestrated saga for creating an order."""

    STEPS = [
        "validate_order",
        "reserve_inventory",
        "charge_payment",
        "confirm_order",
        "send_confirmation"
    ]

    COMPENSATIONS = {
        "reserve_inventory": "release_inventory",
        "charge_payment": "refund_payment",
        "confirm_order": "cancel_order"
    }

    def __init__(self, saga_id: str = None):
        self.saga_id = saga_id or str(uuid.uuid4())
        self.key = f"saga:{self.saga_id}"

    def start(self, order_data: dict) -> str:
        """Initialize a new saga."""
        r.hset(self.key, mapping={
            "id": self.saga_id,
            "status": SagaStatus.STARTED,
            "current_step": self.STEPS[0],
            "completed_steps": json.dumps([]),
            "order_data": json.dumps(order_data),
            "started_at": str(int(time.time()))
        })
        r.expire(self.key, 3600)  # 1 hour TTL

        # Publish first step to the stream
        r.xadd("saga:commands", {
            "saga_id": self.saga_id,
            "command": self.STEPS[0],
            "data": json.dumps(order_data)
        })
        return self.saga_id

    def complete_step(self, step: str, result: dict):
        """Mark a step as completed and trigger the next."""
        state = r.hgetall(self.key)
        completed = json.loads(state.get("completed_steps", "[]"))
        completed.append(step)

        current_index = self.STEPS.index(step)
        next_index = current_index + 1

        if next_index >= len(self.STEPS):
            # All steps done
            r.hset(self.key, mapping={
                "status": SagaStatus.COMPLETED,
                "completed_steps": json.dumps(completed),
                "completed_at": str(int(time.time()))
            })
            return

        next_step = self.STEPS[next_index]
        r.hset(self.key, mapping={
            "status": SagaStatus.STEP_COMPLETED,
            "current_step": next_step,
            "completed_steps": json.dumps(completed),
            f"result:{step}": json.dumps(result)
        })

        order_data = json.loads(state.get("order_data", "{}"))
        r.xadd("saga:commands", {
            "saga_id": self.saga_id,
            "command": next_step,
            "data": json.dumps({**order_data, **result})
        })

    def fail_step(self, step: str, error: str):
        """Handle step failure - trigger compensating transactions."""
        state = r.hgetall(self.key)
        completed = json.loads(state.get("completed_steps", "[]"))

        r.hset(self.key, mapping={
            "status": SagaStatus.COMPENSATING,
            "failed_step": step,
            "error": error,
            "failed_at": str(int(time.time()))
        })

        # Trigger compensations in reverse order
        order_data = json.loads(state.get("order_data", "{}"))
        for done_step in reversed(completed):
            compensation = self.COMPENSATIONS.get(done_step)
            if compensation:
                r.xadd("saga:compensations", {
                    "saga_id": self.saga_id,
                    "command": compensation,
                    "data": json.dumps(order_data)
                })

    def get_state(self) -> dict:
        """Get current saga state."""
        return r.hgetall(self.key)
```

## Service Handlers (Workers)

```python
def run_inventory_worker():
    """Process inventory reservation commands."""
    group = "inventory-service"
    try:
        r.xgroup_create("saga:commands", group, id="0", mkstream=True)
    except Exception:
        pass

    while True:
        messages = r.xreadgroup(
            groupname=group,
            consumername="worker-1",
            streams={"saga:commands": ">"},
            count=1,
            block=5000
        )

        if not messages:
            continue

        for _, stream_msgs in messages:
            for msg_id, fields in stream_msgs:
                if fields.get("command") == "reserve_inventory":
                    saga_id = fields["saga_id"]
                    data = json.loads(fields["data"])
                    saga = OrderSaga(saga_id)

                    try:
                        # Try to reserve inventory
                        reserved = reserve_stock(
                            data["product_id"],
                            data["quantity"]
                        )
                        saga.complete_step("reserve_inventory", {
                            "reservation_id": reserved["id"]
                        })
                    except Exception as e:
                        saga.fail_step("reserve_inventory", str(e))

                    r.xack("saga:commands", group, msg_id)

def reserve_stock(product_id: str, quantity: int) -> dict:
    """Decrement stock atomically."""
    stock_key = f"inventory:{product_id}"
    new_qty = r.decrby(stock_key, quantity)
    if new_qty < 0:
        r.incrby(stock_key, quantity)  # Rollback
        raise Exception(f"Insufficient stock for {product_id}")
    return {"id": f"res_{int(time.time())}", "quantity": quantity}
```

## Starting a Saga

```python
def create_order(order_data: dict) -> str:
    """Initiate an order saga."""
    saga = OrderSaga()
    saga_id = saga.start(order_data)
    return saga_id

# Usage
saga_id = create_order({
    "user_id": "user:123",
    "product_id": "prod:456",
    "quantity": 2,
    "amount": 9998
})
print(f"Order saga started: {saga_id}")

# Check status
saga = OrderSaga(saga_id)
state = saga.get_state()
print(f"Status: {state.get('status')}")
print(f"Current step: {state.get('current_step')}")
```

## Summary

The Saga pattern with Redis Streams enables distributed transactions across microservices by decomposing operations into sequential steps with compensating actions. Redis Streams provide reliable message delivery for command routing, consumer groups ensure at-least-once step processing, and Hash storage persists the full saga state for auditing and recovery. Failed steps trigger reverse compensation commands to maintain data consistency.
