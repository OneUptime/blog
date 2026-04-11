# How to Build an Event-Driven System with Redis Keyspace Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Keyspace Notification, Event-Driven, Architecture

Description: Build an event-driven system using Redis keyspace events to decouple services and trigger workflows when data changes in Redis.

---

Redis keyspace notifications turn Redis into a lightweight event bus. When a key changes, Redis publishes an event that any subscriber can react to - enabling loosely coupled, event-driven architectures without a separate message broker.

## Core Architecture Pattern

```text
Producer Service
      |
   WRITE to Redis (SET, HSET, EXPIRE...)
      |
   Redis publishes keyspace event
      |
   Pub/Sub channel
   /      |      \
Worker   Worker   Worker
(email)  (audit) (analytics)
```

## Enabling Events

```bash
redis-cli CONFIG SET notify-keyspace-events "KEA"
```

For production, limit to the event types you actually use:

```bash
# K=keyspace, E=keyevent, $=string, h=hash, g=generic (DEL/EXPIRE)
redis-cli CONFIG SET notify-keyspace-events "KE$hg"
```

## Building the Event Router

Create an event router that dispatches to registered handlers by key pattern:

```python
import redis
import re
import threading

class KeyspaceEventRouter:
    def __init__(self, redis_client, db=0):
        self.r = redis_client
        self.db = db
        self.handlers = []  # list of (pattern_regex, event_type, handler_fn)
        self.pubsub = self.r.pubsub()

    def on(self, key_pattern, event_type, handler):
        """Register a handler for a key pattern and event type."""
        regex = re.compile(key_pattern.replace("*", ".*"))
        self.handlers.append((regex, event_type, handler))
        return self

    def start(self):
        self.pubsub.psubscribe(f"__keyevent@{self.db}__:*")
        threading.Thread(target=self._listen, daemon=True).start()

    def _handle_message(self, message):
        if message["type"] not in ("message", "pmessage"):
            return
        channel = message["channel"]
        event_type = channel.split(":")[-1]
        key = message["data"]
        for regex, ev_type, handler in self.handlers:
            if (ev_type == "*" or ev_type == event_type) and regex.match(key):
                handler(key, event_type)

    def _listen(self):
        for message in self.pubsub.listen():
            self._handle_message(message)
```

## Registering Domain Handlers

```python
r = redis.Redis(decode_responses=True)
router = KeyspaceEventRouter(r)

def on_order_created(key, event):
    order_id = key.split(":")[1]
    order_data = r.hgetall(key)
    send_confirmation_email(order_data["email"], order_id)
    log_to_analytics(order_id, order_data)

def on_session_expired(key, event):
    session_id = key.split(":")[1]
    cleanup_session_resources(session_id)

def on_inventory_updated(key, event):
    product_id = key.split(":")[1]
    new_qty = r.get(key)
    if int(new_qty) < 10:
        trigger_reorder_workflow(product_id)

router.on("order:*", "hset", on_order_created)
router.on("session:*", "expired", on_session_expired)
router.on("inventory:*", "set", on_inventory_updated)
router.start()
```

## Making Handlers Idempotent

Since Redis notifications are at-most-once, and you may have multiple subscriber instances, handlers must be idempotent. Use a distributed lock or a processed-events set:

```python
def idempotent_handler(r, key, event, handler_fn):
    """Process an event at most once across all nodes."""
    lock_key = f"processed:{key}:{event}"
    acquired = r.set(lock_key, "1", nx=True, ex=5)
    if acquired:
        handler_fn(key, event)
```

## Coordinating Multiple Consumer Instances

If you run multiple instances of the same consumer, all instances receive every event. To distribute work:

```python
import hashlib

NODE_ID = 0
TOTAL_NODES = 3

def should_handle(key):
    """Consistently hash the key to decide which node handles it."""
    h = int(hashlib.md5(key.encode()).hexdigest(), 16)
    return (h % TOTAL_NODES) == NODE_ID
```

## Limitations Compared to a Full Message Queue

| Feature | Redis Keyspace Events | Kafka/SQS |
|---|---|---|
| Delivery guarantee | At-most-once | At-least-once |
| Persistence | None | Yes |
| Replay | No | Yes |
| Fan-out | Yes | Depends |
| Consumer groups | No | Yes |

Use keyspace events for low-stakes reactive workflows (cache invalidation, real-time dashboards). For critical business events, use Redis Streams or a dedicated queue.

## Summary

Redis keyspace notifications enable event-driven systems without additional infrastructure. By registering handlers per key pattern and event type, you decouple producers from consumers. The key constraints are at-most-once delivery and no replay - design handlers to be idempotent and add a fallback reconciliation job for events that may be missed.
