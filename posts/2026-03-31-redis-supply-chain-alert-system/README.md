# How to Build a Supply Chain Alert System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Alert, Supply Chain

Description: Use Redis pub/sub, sorted sets, and keyspace notifications to build a real-time supply chain alert system for stock and delay events.

---

Supply chains break in unexpected ways: a supplier goes out of stock, a shipment is delayed, or a warehouse runs low on a critical item. You need an alert system that detects these conditions in real time and notifies the right teams immediately.

## Alert Data Model

Store active alerts as hashes and maintain a priority queue using a sorted set:

```python
import redis
import time
import json
import uuid

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

ALERT_PRIORITY = {"critical": 1, "high": 2, "medium": 3, "low": 4}

def create_alert(event_type: str, entity_id: str, message: str, priority: str = "medium"):
    alert_id = str(uuid.uuid4())
    alert = {
        "id": alert_id,
        "event_type": event_type,
        "entity_id": entity_id,
        "message": message,
        "priority": priority,
        "status": "open",
        "created_at": time.time()
    }

    score = ALERT_PRIORITY.get(priority, 3) * 1e12 + time.time()

    pipe = r.pipeline()
    # Store alert details
    pipe.hset(f"alert:{alert_id}", mapping={k: str(v) for k, v in alert.items()})
    # Add to priority queue
    pipe.zadd("alerts:queue", {alert_id: score})
    # Index by entity
    pipe.sadd(f"alerts:entity:{entity_id}", alert_id)
    # Publish for real-time subscribers
    pipe.publish(f"alerts:{event_type}", json.dumps(alert))
    pipe.execute()

    return alert_id
```

## Triggering Alerts from Thresholds

Check inventory levels and create alerts automatically:

```python
def check_stock_alert(sku: str, current_qty: int, reorder_point: int):
    if current_qty <= 0:
        create_alert(
            event_type="out_of_stock",
            entity_id=sku,
            message=f"SKU {sku} is out of stock",
            priority="critical"
        )
    elif current_qty <= reorder_point:
        create_alert(
            event_type="low_stock",
            entity_id=sku,
            message=f"SKU {sku} below reorder point: {current_qty} remaining",
            priority="high"
        )

def check_shipment_delay(tracking_id: str, eta: float):
    if time.time() > eta + 3600:  # More than 1 hour late
        create_alert(
            event_type="shipment_delayed",
            entity_id=tracking_id,
            message=f"Shipment {tracking_id} is delayed by over 1 hour",
            priority="high"
        )
```

## Consuming Alerts

Workers subscribe to alert channels and process them:

```python
def alert_worker(event_types: list[str]):
    pubsub = r.pubsub()
    channels = [f"alerts:{et}" for et in event_types]
    pubsub.subscribe(*channels)

    for message in pubsub.listen():
        if message["type"] == "message":
            alert = json.loads(message["data"])
            handle_alert(alert)

def handle_alert(alert: dict):
    print(f"[{alert['priority'].upper()}] {alert['event_type']}: {alert['message']}")
    # Route to Slack, PagerDuty, email, etc.
```

## Alert Deduplication

Prevent flooding the team with repeated alerts for the same issue:

```python
def create_alert_deduped(event_type: str, entity_id: str, message: str,
                          priority: str = "medium", cooldown: int = 3600) -> str | None:
    dedup_key = f"alert:dedup:{event_type}:{entity_id}"
    if r.set(dedup_key, 1, ex=cooldown, nx=True):
        return create_alert(event_type, entity_id, message, priority)
    return None  # Suppressed - duplicate within cooldown window
```

## Acknowledging and Resolving Alerts

```python
def acknowledge_alert(alert_id: str, user: str):
    r.hset(f"alert:{alert_id}", mapping={
        "status": "acknowledged",
        "acknowledged_by": user,
        "acknowledged_at": time.time()
    })

def resolve_alert(alert_id: str):
    pipe = r.pipeline()
    pipe.hset(f"alert:{alert_id}", "status", "resolved")
    pipe.zrem("alerts:queue", alert_id)
    pipe.execute()
```

## Summary

Redis pub/sub provides instant alert delivery while sorted sets maintain a priority-ordered queue for async processors. The deduplication pattern using SET NX prevents alert fatigue during sustained incidents, and storing alerts as hashes gives you a complete audit trail for each supply chain event.
