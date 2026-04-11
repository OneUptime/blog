# How to Implement Compensating Events with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Event Sourcing, Saga, Compensating Transaction, Architecture

Description: Learn how to implement compensating events in Redis Streams to roll back distributed transactions and maintain data consistency in microservices.

---

In distributed systems, a saga pattern handles long-running transactions across services. When one step fails, compensating events undo the work done by previous steps. Redis Streams provide an ideal backbone for publishing and tracking both forward and compensating events.

## The Problem: Partial Failures

Consider an order workflow: `ReserveInventory` succeeds, then `ChargePayment` fails. You must publish a `CancelInventoryReservation` compensating event to reverse the first step.

## Event Structure

Use a consistent structure for both forward and compensating events:

```bash
# Forward event
XADD saga:order-1001:events * \
  type InventoryReserved \
  saga_id order-1001 \
  step 1 \
  compensated false \
  item_id 42 \
  quantity 2

# Compensating event
XADD saga:order-1001:events * \
  type InventoryReservationCancelled \
  saga_id order-1001 \
  step 1 \
  compensated true \
  item_id 42 \
  quantity 2
```

## Saga State Tracking

Track saga state in a Redis Hash:

```python
import redis
import json

client = redis.Redis(host="localhost", port=6379, decode_responses=True)

def start_saga(saga_id: str, steps: list):
    client.hset(f"saga:{saga_id}", mapping={
        "status": "running",
        "completed_steps": json.dumps([]),
        "steps": json.dumps(steps)
    })

def complete_step(saga_id: str, step: str):
    completed = json.loads(client.hget(f"saga:{saga_id}", "completed_steps"))
    completed.append(step)
    client.hset(f"saga:{saga_id}", "completed_steps", json.dumps(completed))

def fail_saga(saga_id: str):
    client.hset(f"saga:{saga_id}", "status", "compensating")
```

## Publishing Compensating Events

When a step fails, publish compensating events for all completed steps in reverse order:

```python
COMPENSATIONS = {
    "ReserveInventory": "CancelInventoryReservation",
    "ChargePayment": "RefundPayment",
    "CreateShipment": "CancelShipment",
}

def compensate_saga(saga_id: str):
    saga = client.hgetall(f"saga:{saga_id}")
    completed = json.loads(saga["completed_steps"])
    fail_saga(saga_id)

    for step in reversed(completed):
        comp_type = COMPENSATIONS.get(step)
        if comp_type:
            client.xadd(f"saga:{saga_id}:events", {
                "type": comp_type,
                "saga_id": saga_id,
                "compensated": "true",
                "original_step": step
            })
            print(f"Published compensation: {comp_type}")

    client.hset(f"saga:{saga_id}", "status", "compensated")
```

## Consuming Compensating Events

A compensation consumer reads the saga stream and handles each compensating event:

```python
def run_compensation_consumer(saga_id: str):
    stream = f"saga:{saga_id}:events"
    last_id = "0"

    while True:
        events = client.xread({stream: last_id}, count=10, block=2000)
        for _, messages in events:
            for msg_id, data in messages:
                if data.get("compensated") == "true":
                    handle_compensation(data)
                last_id = msg_id

def handle_compensation(data: dict):
    event_type = data["type"]
    print(f"Compensating: {event_type} for saga {data['saga_id']}")
    # Call the appropriate rollback service
```

## Idempotency for Compensations

Ensure compensations are idempotent using a Redis Set:

```python
def mark_compensated(saga_id: str, step: str) -> bool:
    key = f"saga:{saga_id}:compensated"
    added = client.sadd(key, step)
    return added == 1  # False means already compensated

def handle_compensation(data: dict):
    if not mark_compensated(data["saga_id"], data["original_step"]):
        print(f"Already compensated: {data['original_step']}, skipping")
        return
    print(f"Executing compensation: {data['type']}")
```

## Summary

Compensating events in Redis Streams let you implement the saga pattern for distributed transaction rollbacks. By tracking saga state in Redis Hashes, publishing compensating events in reverse order, and using a Redis Set to ensure idempotency, you can build reliable rollback logic across microservices. Redis's atomic operations and stream durability make it a strong fit for this pattern.
