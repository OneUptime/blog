# How to Implement Order Fulfillment Queue with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Queue, Order

Description: Build a reliable order fulfillment queue with Redis lists and sorted sets, with priority handling and at-least-once delivery guarantees.

---

Order fulfillment requires a queue that is fast, supports priority (expedited vs. standard shipping), and does not lose orders if a worker crashes. Redis sorted sets give you exactly this.

## Queue Design

Use a sorted set with priority scores so expedited orders are processed first:

```python
import redis
import time
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Priority levels (lower score = higher priority)
PRIORITY = {"expedited": 1, "standard": 2, "economy": 3}

def enqueue_order(order_id: str, priority: str = "standard"):
    order_data = json.dumps({
        "order_id": order_id,
        "priority": priority,
        "enqueued_at": time.time()
    })

    # Score combines priority and time to ensure FIFO within same priority
    score = PRIORITY.get(priority, 2) * 1e12 + time.time()

    pipe = r.pipeline()
    # Add to priority queue
    pipe.zadd("queue:fulfillment", {order_data: score})
    # Store full order in hash
    pipe.hset(f"order:{order_id}", mapping={
        "status": "queued",
        "priority": priority,
        "enqueued_at": time.time()
    })
    pipe.execute()
```

## Reliable Dequeue with Processing Set

Use a "processing" sorted set for at-least-once delivery. If a worker crashes, the order re-enters the queue:

```python
VISIBILITY_TIMEOUT = 300  # seconds

def dequeue_order() -> dict | None:
    # Atomically pop the highest-priority item (lowest score)
    result = r.zpopmin("queue:fulfillment", 1)
    if not result:
        return None

    order_json, score = result[0]

    # Add to processing set with deadline timestamp
    r.zadd("queue:processing", {order_json: time.time() + VISIBILITY_TIMEOUT})

    order = json.loads(order_json)
    # Update status
    r.hset(f"order:{order['order_id']}", "status", "processing")
    return order
```

## Acknowledging Completion

Once an order is fulfilled, remove it from the processing set:

```python
def ack_order(order_id: str, order_json: str):
    pipe = r.pipeline()
    pipe.zrem("queue:processing", order_json)
    pipe.hset(f"order:{order_id}", mapping={
        "status": "fulfilled",
        "fulfilled_at": time.time()
    })
    pipe.execute()
```

## Recovering Stale Items

Run a recovery worker periodically to re-enqueue orders that timed out:

```python
def recover_stale_orders():
    now = time.time()
    # Find orders whose visibility timeout has expired
    stale = r.zrangebyscore("queue:processing", 0, now, withscores=True)

    for order_json, deadline in stale:
        order = json.loads(order_json)
        pipe = r.pipeline()
        pipe.zrem("queue:processing", order_json)

        # Re-enqueue with original priority
        score = PRIORITY.get(order.get("priority", "standard"), 2) * 1e12 + time.time()
        pipe.zadd("queue:fulfillment", {order_json: score})
        pipe.hset(f"order:{order['order_id']}", "status", "queued")
        pipe.execute()

    return len(stale)
```

## Queue Depth Monitoring

```python
def get_queue_stats() -> dict:
    return {
        "pending": r.zcard("queue:fulfillment"),
        "processing": r.zcard("queue:processing"),
        "oldest_pending_age": _oldest_age("queue:fulfillment")
    }

def _oldest_age(queue_key: str) -> float:
    items = r.zrange(queue_key, 0, 0, withscores=True)
    if not items:
        return 0
    order = json.loads(items[0][0])
    return time.time() - order.get("enqueued_at", time.time())
```

## Summary

Redis sorted sets enable priority-aware queuing with FIFO ordering within each priority tier. Moving items to a processing set before consuming them provides at-least-once delivery semantics, and a simple recovery worker handles worker crashes - giving you a robust fulfillment queue without a dedicated message broker.
