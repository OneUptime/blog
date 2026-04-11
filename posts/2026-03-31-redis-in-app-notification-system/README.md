# How to Build an In-App Notification System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Notification, Pub/Sub, Real-Time

Description: Build a complete in-app notification system with Redis - store per-user notification feeds, push real-time updates via Pub/Sub, and batch-mark notifications as read.

---

In-app notifications require two complementary components: a persistent store of notification history and a real-time delivery channel. Redis handles both with Lists for storage and Pub/Sub for live push.

## Data Model

```text
notif:feed:{userId}          -> List: notification IDs (newest first, capped at 200)
notif:item:{notifId}         -> Hash: type, actor, ref, message, timestamp, read
notif:unread:{userId}        -> String: unread count
notif:channel:{userId}       -> Pub/Sub channel for live delivery
```

## Creating a Notification

```python
import redis
import json
import uuid
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

FEED_MAX_SIZE = 200

def create_notification(user_id, notif_type, actor_id, ref_id="", message=""):
    notif_id = str(uuid.uuid4())
    now = time.time()

    notif_data = {
        "id": notif_id,
        "type": notif_type,
        "actor_id": actor_id,
        "ref_id": ref_id,
        "message": message,
        "timestamp": str(now),
        "read": "0",
    }

    pipe = r.pipeline()
    pipe.hset(f"notif:item:{notif_id}", mapping=notif_data)
    pipe.lpush(f"notif:feed:{user_id}", notif_id)
    pipe.ltrim(f"notif:feed:{user_id}", 0, FEED_MAX_SIZE - 1)
    pipe.incr(f"notif:unread:{user_id}")
    pipe.execute()

    # Push live notification via Pub/Sub
    r.publish(f"notif:channel:{user_id}", json.dumps(notif_data))

    return notif_id
```

## Fetching the Notification Feed

```python
def get_notifications(user_id, page=0, per_page=20):
    start = page * per_page
    end = start + per_page - 1
    notif_ids = r.lrange(f"notif:feed:{user_id}", start, end)

    pipe = r.pipeline()
    for nid in notif_ids:
        pipe.hgetall(f"notif:item:{nid}")
    return [n for n in pipe.execute() if n]

def get_unread_count(user_id):
    count = r.get(f"notif:unread:{user_id}")
    return int(count) if count else 0
```

## Marking Notifications as Read

```python
def mark_read(user_id, notif_id):
    prev = r.hget(f"notif:item:{notif_id}", "read")
    if prev == "0":
        r.hset(f"notif:item:{notif_id}", "read", "1")
        new_count = r.decr(f"notif:unread:{user_id}")
        if new_count < 0:
            r.set(f"notif:unread:{user_id}", 0)

def mark_all_read(user_id):
    notif_ids = r.lrange(f"notif:feed:{user_id}", 0, -1)
    pipe = r.pipeline()
    for nid in notif_ids:
        pipe.hset(f"notif:item:{nid}", "read", "1")
    pipe.set(f"notif:unread:{user_id}", 0)
    pipe.execute()
```

## Real-Time Delivery via Pub/Sub

```python
def subscribe_to_notifications(user_id, on_notification_fn):
    """Run this in a separate thread or async task per connected client."""
    p = r.pubsub()
    p.subscribe(f"notif:channel:{user_id}")
    for message in p.listen():
        if message["type"] == "message":
            notification = json.loads(message["data"])
            on_notification_fn(notification)
```

## Aggregating Notifications (Grouping)

Prevent notification overload by grouping similar events:

```python
def create_grouped_notification(user_id, notif_type, actor_ids, ref_id, message):
    dedup_key = f"notif:group:{user_id}:{notif_type}:{ref_id}"
    existing = r.get(dedup_key)
    if existing:
        # Update existing notification's message instead of creating new
        notif_id = existing
        actor_count = len(actor_ids)
        r.hset(f"notif:item:{notif_id}", "message",
               f"{actor_count} people {message}")
        return notif_id
    else:
        notif_id = create_notification(user_id, notif_type, actor_ids[0], ref_id, message)
        r.set(dedup_key, notif_id, ex=3600)
        return notif_id
```

## Example Usage

```bash
# Create notification
HSET notif:item:abc type like actor_id user:5 ref_id post:1 read 0
LPUSH notif:feed:user:1 abc
INCR notif:unread:user:1

# Real-time push
PUBLISH notif:channel:user:1 '{"type":"like","actor_id":"user:5"}'

# Get unread count
GET notif:unread:user:1   # 1
```

## Summary

Combining Redis Lists for persistent notification history with Pub/Sub for real-time delivery creates a complete in-app notification system. LTRIM keeps the feed bounded without extra maintenance, and grouped notifications reduce noise for viral content. For WebSocket-based apps, the Pub/Sub subscriber runs in the WebSocket connection handler and forwards messages directly to the browser.
