# How to Use Redis Streams with FastAPI for Event Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, FastAPI, Stream, Event Processing, Python

Description: Process events reliably in FastAPI using Redis Streams with consumer groups, acknowledgments, and async background readers.

---

Redis Streams provide a persistent, ordered log of events with consumer group support - making them ideal for event-driven FastAPI services that need guaranteed delivery.

## Install Dependencies

```bash
pip install fastapi uvicorn redis
```

## Publish Events from a FastAPI Endpoint

```python
from redis.asyncio import Redis
from fastapi import FastAPI

app = FastAPI()
redis = Redis.from_url("redis://localhost:6379")

@app.post("/events/order")
async def create_order(order_id: str, amount: float):
    msg_id = await redis.xadd(
        "orders",
        {"order_id": order_id, "amount": str(amount), "status": "pending"},
        maxlen=10000,
    )
    return {"event_id": msg_id}
```

`XADD` appends the event to the stream. `maxlen=10000` caps the stream size to prevent unbounded growth.

## Create a Consumer Group

Run this once at startup to initialise the group:

```python
@app.on_event("startup")
async def create_group():
    try:
        await redis.xgroup_create("orders", "order-processors", id="0", mkstream=True)
    except Exception:
        pass  # Group already exists
```

## Read Events with a Consumer

```python
import asyncio

async def process_orders():
    while True:
        messages = await redis.xreadgroup(
            groupname="order-processors",
            consumername="worker-1",
            streams={"orders": ">"},
            count=10,
            block=5000,
        )
        for stream, entries in messages or []:
            for msg_id, data in entries:
                print(f"Processing order {data[b'order_id'].decode()}")
                # Acknowledge after successful processing
                await redis.xack("orders", "order-processors", msg_id)
```

The `>` special ID means "give me only new, undelivered messages."

## Run the Consumer in the Background

```python
@app.on_event("startup")
async def start_consumer():
    asyncio.create_task(process_orders())
```

## Handle Pending (Unacknowledged) Messages

Claim messages that were delivered but not acknowledged after a timeout:

```python
async def reclaim_stale_messages():
    pending = await redis.xautoclaim(
        "orders",
        "order-processors",
        "worker-1",
        min_idle_time=60000,  # 60 seconds
        start_id="0-0",
        count=50,
    )
    for msg_id, data in pending[1]:
        print(f"Reclaiming stale message {msg_id}")
        await redis.xack("orders", "order-processors", msg_id)
```

## Inspect Stream Health

```bash
# Check stream length
redis-cli xlen orders

# View pending messages per consumer
redis-cli xpending orders order-processors - + 10
```

## Summary

Redis Streams in FastAPI enable reliable event-driven processing with consumer groups for load distribution and message acknowledgment for at-least-once delivery. Running the consumer as an asyncio background task keeps the architecture simple without a separate worker process, while `XAUTOCLAIM` handles crash recovery for stale messages.
