# How to Build a Social Media Notification System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Notification, List, Sorted Set

Description: Design a real-time social notification system with Redis - queue notifications per user, track unread counts, and support notification preferences with TTL-based cleanup.

---

Social platforms generate notifications for likes, comments, follows, and mentions. Redis provides the speed and data structures needed to deliver notifications in real-time while keeping unread counts accurate.

## Data Model

```text
notifications:{userId}        -> List of notification IDs (newest first)
notification:{notifId}        -> Hash with type, actor, content, timestamp
unread_count:{userId}         -> String counter for unread notifications
notif_prefs:{userId}          -> Hash of notification preferences
```

## Creating a Notification

```python
import redis
import uuid
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_notification(user_id, notif_type, actor_id, ref_id=None, message=""):
    notif_id = str(uuid.uuid4())
    notif_data = {
        "id": notif_id,
        "type": notif_type,       # like, comment, follow, mention
        "actor_id": actor_id,
        "ref_id": ref_id or "",
        "message": message,
        "timestamp": str(time.time()),
        "read": "0",
    }
    pipe = r.pipeline()
    pipe.hset(f"notification:{notif_id}", mapping=notif_data)
    pipe.lpush(f"notifications:{user_id}", notif_id)
    pipe.ltrim(f"notifications:{user_id}", 0, 499)  # Keep latest 500
    pipe.incr(f"unread_count:{user_id}")
    pipe.execute()
    return notif_id
```

## Fetching Notifications

```python
def get_notifications(user_id, page=0, per_page=20):
    start = page * per_page
    end = start + per_page - 1
    notif_ids = r.lrange(f"notifications:{user_id}", start, end)

    pipe = r.pipeline()
    for nid in notif_ids:
        pipe.hgetall(f"notification:{nid}")
    return [n for n in pipe.execute() if n]

def get_unread_count(user_id):
    count = r.get(f"unread_count:{user_id}")
    return int(count) if count else 0
```

## Marking Notifications as Read

```python
def mark_as_read(user_id, notif_id):
    r.hset(f"notification:{notif_id}", "read", "1")

def mark_all_as_read(user_id):
    notif_ids = r.lrange(f"notifications:{user_id}", 0, -1)
    pipe = r.pipeline()
    for nid in notif_ids:
        pipe.hset(f"notification:{nid}", "read", "1")
    pipe.set(f"unread_count:{user_id}", 0)
    pipe.execute()
```

## Notification Deduplication

Prevent duplicate notifications (e.g., 10 likes in quick succession) by checking recently sent notifications:

```python
def create_deduplicated_notification(user_id, notif_type, actor_id, ref_id):
    dedup_key = f"notif_dedup:{user_id}:{notif_type}:{ref_id}"
    if r.set(dedup_key, "1", nx=True, ex=300):  # Deduplicate within 5 minutes
        create_notification(user_id, notif_type, actor_id, ref_id)
```

## Notification Preferences

```python
def set_notification_pref(user_id, notif_type, enabled):
    r.hset(f"notif_prefs:{user_id}", notif_type, "1" if enabled else "0")

def should_notify(user_id, notif_type):
    pref = r.hget(f"notif_prefs:{user_id}", notif_type)
    return pref != "0"  # Default to enabled
```

## Example Usage

```bash
# Create a like notification
HSET notification:abc type like actor_id user:5 ref_id post:42 read 0
LPUSH notifications:user:1 abc
INCR unread_count:user:1

# Get unread count
GET unread_count:user:1   # Returns 1

# Mark all read
SET unread_count:user:1 0
```

## Summary

Redis provides the speed and flexibility required for real-time social notifications. Combining Lists for ordered storage, Hashes for notification data, and atomic counters for unread badges gives a complete, low-latency system. Add deduplication with short-lived keys to avoid notification fatigue for active content.
