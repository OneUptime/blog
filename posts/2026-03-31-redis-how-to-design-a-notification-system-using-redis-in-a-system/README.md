# How to Design a Notification System Using Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, System Design, Notification, Pub/Sub, Queue, Scalability

Description: Learn how to design a scalable notification system using Redis Pub/Sub, lists, and sorted sets for real-time and batch delivery.

---

## Why Redis for a Notification System

Notification systems must handle high write throughput, fan-out to many recipients, and reliable delivery across channels like push, email, and SMS. Redis provides the building blocks for all these requirements: Pub/Sub for real-time delivery, lists as reliable queues, and sorted sets for priority ordering.

## Types of Notifications

Before designing, classify your notifications:

- **Real-time alerts** - delivered immediately (likes, mentions, system alerts)
- **Digest notifications** - batched and sent periodically (weekly summaries)
- **Transactional** - triggered by user actions (password reset, order shipped)
- **Broadcast** - sent to all users or a segment (announcements)

## High-Level Architecture

```text
Event Producer
    |
    v
Redis Stream (event log)
    |
    v
Notification Processor (fan-out service)
    |-------> Redis Pub/Sub (real-time WebSocket delivery)
    |-------> Redis List    (email queue)
    |-------> Redis List    (push queue)
    |-------> Redis Sorted Set (user notification inbox)
```

## Fan-Out Pattern with Pub/Sub

When an event occurs, publish it to all relevant user channels:

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def notify_followers(user_id, event_type, payload):
    # Get user's followers from application DB (or Redis Set)
    followers = r.smembers(f'followers:{user_id}')
    message = json.dumps({
        'type': event_type,
        'from': user_id,
        'data': payload,
        'ts': int(__import__('time').time())
    })
    for follower_id in followers:
        r.publish(f'notifications:{follower_id}', message)

# Usage
notify_followers('alice', 'new_post', {'post_id': '123', 'title': 'Hello World'})
```

Subscribe on the WebSocket server side:

```python
def listen_for_notifications(user_id, ws_send_fn):
    sub = r.pubsub()
    sub.subscribe(f'notifications:{user_id}')
    for message in sub.listen():
        if message['type'] == 'message':
            ws_send_fn(message['data'])
```

## Persistent Notification Inbox with Sorted Sets

Real-time delivery via Pub/Sub is fire-and-forget. For offline users, store notifications in a sorted set ordered by timestamp:

```bash
# Store notification with timestamp as score
ZADD inbox:user:bob 1711900000 '{"type":"like","from":"alice","post":"123"}'

# Get latest 20 notifications
ZRANGE inbox:user:bob 0 19 REV WITHSCORES

# Count unread notifications
ZCOUNT inbox:user:bob 1711800000 +inf

# Mark all as read (update a "last read" timestamp key)
SET inbox:user:bob:lastRead 1711900000

# Trim inbox to last 100 notifications
ZREMRANGEBYRANK inbox:user:bob 0 -101
```

## Delivery Queues with Redis Lists

For async delivery channels (email, SMS, push), use lists as FIFO queues:

```python
def enqueue_email(user_id, template, context):
    job = json.dumps({
        'user_id': user_id,
        'template': template,
        'context': context
    })
    r.rpush('queue:email', job)

def enqueue_push(device_token, title, body):
    job = json.dumps({
        'device_token': device_token,
        'title': title,
        'body': body
    })
    r.rpush('queue:push', job)

# Worker consuming the email queue
def email_worker():
    while True:
        result = r.blpop('queue:email', timeout=5)
        if result:
            _, raw = result
            job = json.loads(raw)
            send_email(job['user_id'], job['template'], job['context'])
```

## Priority Queue for Notifications

Use a sorted set as a priority queue where lower scores mean higher priority:

```bash
# Add high-priority security alert (priority 1)
ZADD queue:notifications 1 '{"type":"security_alert","user":"bob"}'

# Add normal notification (priority 10)
ZADD queue:notifications 10 '{"type":"like","user":"bob"}'

# Worker pops the highest priority item
ZPOPMIN queue:notifications
```

## Rate Limiting Notifications

Prevent notification spam with a fixed window counter:

```python
def can_notify(user_id, max_per_hour=10):
    key = f'notif:ratelimit:{user_id}'
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, 3600)
    count, _ = pipe.execute()
    return count <= max_per_hour
```

## Notification Preferences

Store user preferences to suppress unwanted channels:

```bash
# User opts out of email notifications
HSET notif:prefs:bob email 0 push 1 sms 0

# Check before sending
HGET notif:prefs:bob email
```

## Handling Fan-Out at Scale

For users with millions of followers (celebrities, major accounts), direct fan-out is too slow. Use a hybrid approach:

1. Publish to a Redis Stream with the event
2. A fan-out service reads from the stream using consumer groups
3. Each consumer group shard handles a subset of followers

```bash
# Producer writes event
XADD events:new_posts * user_id alice post_id 123

# Create consumer group (run once)
XGROUP CREATE events:new_posts fanout-workers $ MKSTREAM

# Consumer group reads and distributes
XREADGROUP GROUP fanout-workers worker-1 COUNT 10 STREAMS events:new_posts >
```

## Summary

A Redis-based notification system combines Pub/Sub for real-time delivery, sorted sets for persistent inboxes, and lists or sorted sets for async delivery queues. Rate limiting and preference checks prevent spam, while Redis Streams with consumer groups handle fan-out at scale. In a system design interview, emphasize the tradeoffs between real-time delivery reliability and the eventual consistency of inbox storage.
