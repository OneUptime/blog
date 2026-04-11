# How to Design a Notification System Using Redis in a System Design Interview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, System Design, Notification, Interview, Pub/Sub, Stream, Architecture

Description: A system design walkthrough for building a scalable notification system using Redis, covering delivery channels, unread counts, and fan-out strategies.

---

## Problem Statement

Design a notification system that:
- Delivers notifications to users via in-app, email, and push channels
- Shows unread notification counts in real time
- Stores notification history (last 90 days)
- Handles 500K notifications/sec at peak (e.g., viral content)

## Architecture Overview

```text
Event Sources (likes, comments, follows)
    |
    v
Notification Service --> Redis Stream (event queue)
                     |
                     +---> Fan-out Worker (resolves recipients)
                               |
                               +---> Redis Pub/Sub (in-app real-time)
                               +---> Redis Stream (email/push queue)
                               +---> Redis (unread counts, notification list)
```

## Notification Data Model in Redis

```text
Key                                 Type    TTL         Purpose
---                                 ----    ---         -------
user:{id}:notifications             ZSet    90 days     Notification list (by timestamp)
user:{id}:unread-count              String  None        Unread notification count
pubsub: user:{id}:notify            Pub/Sub -           Real-time delivery
queue:email-notifications           Stream  -           Email delivery queue
queue:push-notifications            Stream  -           Push delivery queue
```

## Notification Data Structure

```python
import redis
import json
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_notification(user_id: int, notification: dict) -> str:
    """Store a notification and increment unread count."""
    notif_id = f"{int(time.time() * 1000)}-{user_id}"

    notification_data = {
        'id': notif_id,
        'type': notification['type'],       # 'like', 'comment', 'follow'
        'actorId': str(notification['actor_id']),
        'actorName': notification['actor_name'],
        'entityId': str(notification.get('entity_id', '')),
        'entityType': notification.get('entity_type', ''),
        'message': notification['message'],
        'isRead': '0',
        'createdAt': str(int(time.time()))
    }

    # Add to user's notification sorted set (score = timestamp for ordering)
    score = float(time.time())
    r.zadd(
        f"user:{user_id}:notifications",
        {json.dumps(notification_data): score}
    )

    # Trim to last 500 notifications per user
    r.zremrangebyrank(f"user:{user_id}:notifications", 0, -501)

    # Set 90-day TTL
    r.expire(f"user:{user_id}:notifications", 7776000)

    # Increment unread count
    r.incr(f"user:{user_id}:unread-count")

    return notif_id
```

## Fan-Out: Delivering to Many Users

```python
def fan_out_notification(actor_id: int, notification_template: dict, recipient_ids: list):
    """Send a notification to multiple recipients."""

    for user_id in recipient_ids:
        if user_id == actor_id:
            continue  # Don't notify the actor themselves

        notification = {**notification_template, 'actor_id': actor_id}

        # Store notification
        notif_id = create_notification(user_id, notification)

        # Real-time delivery via Pub/Sub (for online users)
        r.publish(f"user:{user_id}:notify", json.dumps({
            'id': notif_id,
            'type': notification['type'],
            'message': notification['message'],
            'unreadCount': int(r.get(f"user:{user_id}:unread-count") or 0)
        }))

    # Queue email/push for async delivery
    r.xadd('queue:email-notifications', {
        'recipientIds': json.dumps(recipient_ids),
        'actorId': str(actor_id),
        'template': json.dumps(notification_template),
        'scheduledAt': str(int(time.time()))
    })
```

## Fan-Out Strategies

```text
Strategy            Description                         Best For
--------            -----------                         --------
Fan-out on write    Deliver to all recipients eagerly   Small follower counts
Fan-out on read     Compute recipients when user logs in Celebrities (10M+ followers)
Hybrid              Eager for small, lazy for large     Most production systems
```

```python
FOLLOWER_THRESHOLD = 10000

def smart_fan_out(actor_id: int, notification: dict):
    follower_count = get_follower_count(actor_id)

    if follower_count <= FOLLOWER_THRESHOLD:
        # Fan-out on write - deliver immediately
        followers = get_followers(actor_id)
        fan_out_notification(actor_id, notification, followers)
    else:
        # Fan-out on read - store notification in actor's feed
        r.zadd(f"actor:{actor_id}:notifications", {
            json.dumps(notification): float(time.time())
        })
        # Merge on read when users request their feed
```

## Reading Notifications

```python
def get_notifications(user_id: int, page: int = 0, page_size: int = 20) -> list:
    """Get paginated notifications in reverse chronological order."""
    start = page * page_size
    end = start + page_size - 1

    entries = r.zrevrange(
        f"user:{user_id}:notifications",
        start, end,
        withscores=False
    )

    return [json.loads(entry) for entry in entries]

def mark_notifications_read(user_id: int, notification_ids: list):
    """Mark specific notifications as read."""
    # Reset unread count
    r.set(f"user:{user_id}:unread-count", 0)

def get_unread_count(user_id: int) -> int:
    count = r.get(f"user:{user_id}:unread-count")
    return int(count) if count else 0
```

## Real-Time Delivery WebSocket Integration

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: 'localhost', port: 6379 });
const subscriber = new Redis({ host: 'localhost', port: 6379 });

// When user connects via WebSocket
async function onUserConnect(userId, ws) {
  // Subscribe to their notification channel
  await subscriber.subscribe(`user:${userId}:notify`);

  subscriber.on('message', (channel, message) => {
    const targetUserId = channel.replace('user:', '').replace(':notify', '');
    if (targetUserId === String(userId) && ws.readyState === 1) {
      ws.send(message);
    }
  });

  // Send current unread count on connect
  const unreadCount = await redis.get(`user:${userId}:unread-count`);
  ws.send(JSON.stringify({ type: 'unread-count', count: parseInt(unreadCount) || 0 }));
}
```

## Email/Push Queue Consumer

```python
def consume_email_notifications():
    """Worker to consume email notification queue."""
    r.xgroup_create('queue:email-notifications', 'email-workers', id='$', mkstream=True)

    while True:
        messages = r.xreadgroup(
            'email-workers', 'worker-1',
            {'queue:email-notifications': '>'},
            count=10, block=1000
        )

        if not messages:
            continue

        for stream, entries in messages:
            for msg_id, fields in entries:
                try:
                    recipient_ids = json.loads(fields['recipientIds'])
                    template = json.loads(fields['template'])

                    for uid in recipient_ids:
                        send_email_notification(uid, template)

                    r.xack('queue:email-notifications', 'email-workers', msg_id)
                except Exception as e:
                    print(f"Failed to send notification: {e}")
```

## Capacity Estimation

```text
500K notifications/sec:
- Fan-out: avg 100 followers per user = 50M Redis writes/sec
- Need Redis Cluster with 50 shards

Storage:
- 500 notifications per user * 300 bytes = 150KB per user
- 100M users = 15TB (distribute across cluster)

Real-time delivery:
- Pub/Sub fanout per notification: 1 message to 1 user channel
- 500K Pub/Sub publishes/sec -> Redis handles easily
```

## Summary

A notification system uses Redis Sorted Sets for ordered notification history, atomic INCR for unread counts, Pub/Sub for real-time in-app delivery, and Streams for async email and push queuing. The fan-out strategy choice (write vs. read) is the core scalability decision - eager fan-out works for most users, while lazy fan-out (merge on read) is necessary for celebrities with millions of followers.
