# How to Implement the Observer Pattern with Redis Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Observer, Pub/Sub, Pattern, Event

Description: Implement the observer pattern across distributed services using Redis Pub/Sub channels so publishers broadcast events without knowing their subscribers.

---

The observer pattern lets objects subscribe to events from a subject without the subject knowing who is listening. Redis Pub/Sub extends this across process and network boundaries: a publisher writes to a channel and all subscribers receive the message, enabling decoupled event-driven systems without a heavyweight message broker.

## The Pattern

Subject (publisher) - emits events to a named channel.
Observer (subscriber) - registers interest in a channel and receives events.

Unlike single-process observer patterns, Redis Pub/Sub scales to thousands of subscribers across many servers.

## Publisher (Subject)

```python
import redis
import json
import time

r = redis.Redis()

class OrderSubject:
    def __init__(self, redis_client):
        self._r = redis_client

    def place_order(self, order_id, user_id, amount):
        # Business logic here
        self._notify("order.placed", {
            "order_id": order_id,
            "user_id": user_id,
            "amount": amount,
            "ts": time.time()
        })

    def ship_order(self, order_id, user_id, tracking_number):
        self._notify("order.shipped", {
            "order_id": order_id,
            "user_id": user_id,
            "tracking": tracking_number,
            "ts": time.time()
        })

    def _notify(self, event_type, data):
        self._r.publish(f"events:{event_type}", json.dumps(data))
```

## Observer Base Class

```python
import threading

class RedisObserver:
    def __init__(self, redis_client, channels: list):
        self._r = redis_client
        self._channels = channels
        self._pubsub = redis_client.pubsub()

    def subscribe(self):
        self._pubsub.subscribe(**{ch: self._dispatch for ch in self._channels})
        thread = self._pubsub.run_in_thread(sleep_time=0.01, daemon=True)
        return thread

    def _dispatch(self, message):
        if message["type"] == "message":
            event = json.loads(message["data"])
            self.on_event(message["channel"].decode(), event)

    def on_event(self, channel: str, event: dict):
        raise NotImplementedError
```

## Concrete Observers

```python
class NotificationObserver(RedisObserver):
    def on_event(self, channel, event):
        if channel == "events:order.placed":
            send_order_confirmation(event["user_id"], event["order_id"])
        elif channel == "events:order.shipped":
            send_shipping_notification(event["user_id"], event["tracking"])

class InventoryObserver(RedisObserver):
    def on_event(self, channel, event):
        if channel == "events:order.placed":
            reserve_inventory(event["order_id"])

class AnalyticsObserver(RedisObserver):
    def on_event(self, channel, event):
        record_event_metric(channel, event)
```

## Wiring Everything Together

```python
subject = OrderSubject(r)

# Each observer runs in its own service/process
notification_obs = NotificationObserver(r, ["events:order.placed", "events:order.shipped"])
inventory_obs = InventoryObserver(r, ["events:order.placed"])
analytics_obs = AnalyticsObserver(r, ["events:order.placed", "events:order.shipped"])

notification_obs.subscribe()
inventory_obs.subscribe()
analytics_obs.subscribe()

# Publisher triggers all observers
subject.place_order("o-001", "u-001", 99.99)
```

## Pattern Subscriptions

Subscribe to all order events with a glob pattern:

```python
pubsub = r.pubsub()
pubsub.psubscribe("events:order.*")
```

This registers one subscriber for all current and future order event types.

## Limitations and Mitigations

Redis Pub/Sub does not persist messages - if a subscriber is offline, it misses events. For critical observers, upgrade to Redis Streams with consumer groups:

```python
r.xadd("events:order.placed", {"order_id": "o-001", "user_id": "u-001"})
```

Streams persist messages and allow late-joining consumers to catch up from any point.

## Summary

Redis Pub/Sub implements the observer pattern across distributed services with zero coupling between publishers and subscribers. Pattern subscriptions allow observers to react to entire event families, while the upgrade path to Redis Streams provides durability for observers that cannot afford to miss events during downtime.
