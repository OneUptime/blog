# How to Implement CQRS with Redis as Read Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CQRS, Architecture, Cache, Pattern

Description: Implement the CQRS pattern by using Redis as a purpose-built read store that serves query models updated from write-side events, eliminating read load on the primary database.

---

Command Query Responsibility Segregation (CQRS) separates write operations (commands) from read operations (queries) into distinct models. Redis excels as the read store because it can hold query-optimized projections of your data that are updated in real time from write-side events, serving reads at sub-millisecond speeds.

## The Pattern

Write side: Your application writes to a primary database (PostgreSQL, MongoDB) and publishes domain events.

Read side: Event handlers consume those events and update Redis-based read models optimized for each query pattern.

## Write Side: Publishing Events

After a successful write, emit an event:

```python
import redis
import json

r = redis.Redis()

def create_order(order_id, user_id, items, total):
    # Write to primary database
    db.execute("INSERT INTO orders ...", order_id, user_id, items, total)
    # Publish event
    event = {"type": "order.created", "order_id": order_id,
             "user_id": user_id, "items": json.dumps(items), "total": total}
    r.xadd("events:orders", event)
```

## Read Side: Projecting into Redis

An event handler builds the read model from the stream:

```python
def project_order_summary(event):
    order_id = event[b"order_id"].decode()
    user_id = event[b"user_id"].decode()
    total = event[b"total"].decode()
    # Update per-order read model
    r.hset(f"read:order:{order_id}", mapping={
        "user_id": user_id, "total": total, "status": "pending"
    })
    # Update user's order list
    r.zadd(f"read:user:{user_id}:orders", {order_id: float(__import__("time").time())})
```

## Event Handler Worker

Consume events and project:

```python
def run_projection_worker():
    try:
        r.xgroup_create("events:orders", "projection-workers", id="$", mkstream=True)
    except redis.exceptions.ResponseError:
        pass  # Group already exists
    while True:
        messages = r.xreadgroup("projection-workers", "worker-1",
                                {"events:orders": ">"}, count=100, block=1000)
        for _, entries in (messages or []):
            for msg_id, fields in entries:
                event_type = fields.get(b"type", b"").decode()
                if event_type == "order.created":
                    project_order_summary(fields)
                elif event_type == "order.shipped":
                    update_order_status(fields)
                r.xack("events:orders", "projection-workers", msg_id)
```

## Query Side: Reading from Redis

All reads hit Redis, never the primary database:

```python
def get_order(order_id):
    return r.hgetall(f"read:order:{order_id}")

def get_user_orders(user_id, page=0, page_size=20):
    start = page * page_size
    end = start + page_size - 1
    order_ids = r.zrevrange(f"read:user:{user_id}:orders", start, end)
    pipe = r.pipeline()
    for oid in order_ids:
        pipe.hgetall(f"read:order:{oid.decode()}")
    return pipe.execute()
```

## Handling Eventual Consistency

Read models are eventually consistent - they update after the event is processed. Accept a brief lag or use a version check:

```python
def get_order_with_version(order_id, expected_version):
    order = r.hgetall(f"read:order:{order_id}")
    current_version = int(order.get(b"version", b"0"))
    if current_version < expected_version:
        # Fall back to primary database for freshest data
        return db.query("SELECT * FROM orders WHERE id = %s", order_id)
    return order
```

## Rebuilding Projections

If the read store becomes stale, replay events from the beginning:

```bash
XRANGE events:orders - + COUNT 1000
```

Reprocess all events starting from ID `0` to rebuild the projection from scratch.

## Summary

CQRS with Redis as the read store offloads all query traffic from the primary database by maintaining purpose-built projections updated through event streams. The pattern delivers sub-millisecond reads, supports complex query shapes without SQL joins, and allows projection rebuilds by replaying events - combining the write strength of a relational database with the read speed of Redis.
