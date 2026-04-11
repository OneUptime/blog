# How to Use Redis Pub/Sub in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, Pub/Sub, Messaging, Real-Time

Description: Learn how to implement Redis Pub/Sub in Python with redis-py, including publishers, subscribers, pattern subscriptions, and handling messages in background threads.

---

## What Is Redis Pub/Sub?

Redis Pub/Sub is a messaging pattern where publishers send messages to channels, and subscribers receive messages from those channels. Key characteristics:

- Messages are not persisted - subscribers only receive messages published while connected
- Any number of subscribers can listen to a channel
- Publishers do not know about subscribers
- Pattern subscriptions allow wildcard channel matching

Use cases: real-time notifications, live feeds, event broadcasting, chat systems.

## Basic Publisher and Subscriber

Publisher:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Publish a message to a channel
subscribers = r.publish('news:sports', 'Team A wins the championship!')
print(f"Message delivered to {subscribers} subscribers")
```

Subscriber:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Create a pubsub object
pubsub = r.pubsub()

# Subscribe to a channel
pubsub.subscribe('news:sports')

# Listen for messages
for message in pubsub.listen():
    if message['type'] == 'message':
        print(f"Channel: {message['channel']}")
        print(f"Data: {message['data']}")
```

## Subscribing to Multiple Channels

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

pubsub = r.pubsub()
pubsub.subscribe('news:sports', 'news:tech', 'news:finance')

for message in pubsub.listen():
    if message['type'] == 'message':
        channel = message['channel']
        data = message['data']
        print(f"[{channel}] {data}")
```

## Pattern Subscriptions

Use `psubscribe` with glob patterns to match multiple channels:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

pubsub = r.pubsub()

# Subscribe to all news channels
pubsub.psubscribe('news:*')

for message in pubsub.listen():
    if message['type'] == 'pmessage':
        pattern = message['pattern']
        channel = message['channel']
        data = message['data']
        print(f"[{pattern}] [{channel}] {data}")
```

## Running Subscriber in a Background Thread

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def handle_message(message):
    if message['type'] == 'message':
        print(f"Received: {message['data']} on {message['channel']}")

pubsub = r.pubsub()
pubsub.subscribe(**{'notifications:user:1001': handle_message})

# Run listener in background thread
thread = pubsub.run_in_thread(sleep_time=0.01)

# Your main program continues
print("Subscriber running in background...")
time.sleep(5)

# Stop the background thread
thread.stop()
pubsub.unsubscribe()
pubsub.close()
```

## Real-Time Notification System

```python
import redis
import json

class NotificationSystem:
    def __init__(self, host='localhost', port=6379):
        self.publisher = redis.Redis(host=host, port=port, decode_responses=True)
        self.subscriber_conn = redis.Redis(host=host, port=port, decode_responses=True)
        self.pubsub = self.subscriber_conn.pubsub()

    def send_notification(self, user_id, notification_type, message):
        channel = f'notifications:{user_id}'
        payload = json.dumps({
            'type': notification_type,
            'message': message,
        })
        count = self.publisher.publish(channel, payload)
        print(f"Notification sent to {count} subscribers on {channel}")
        return count

    def subscribe_user(self, user_id, callback):
        channel = f'notifications:{user_id}'
        self.pubsub.subscribe(**{channel: callback})
        self.thread = self.pubsub.run_in_thread(sleep_time=0.01)
        print(f"Subscribed to {channel}")

    def stop(self):
        self.thread.stop()
        self.pubsub.close()

def my_handler(message):
    if message['type'] == 'message':
        data = json.loads(message['data'])
        print(f"NOTIFICATION: [{data['type']}] {data['message']}")

ns = NotificationSystem()
ns.subscribe_user('1001', my_handler)

import time
time.sleep(1)
ns.send_notification('1001', 'alert', 'Your order has shipped!')
ns.send_notification('1001', 'promo', '20% off your next purchase')
time.sleep(1)
ns.stop()
```

## Unsubscribing

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

pubsub = r.pubsub()
pubsub.subscribe('channel1', 'channel2')

# Unsubscribe from a specific channel
pubsub.unsubscribe('channel1')

# Unsubscribe from all channels
pubsub.unsubscribe()

# For pattern subscriptions
pubsub.punsubscribe('news:*')

# Close connection
pubsub.close()
```

## Checking Subscription Status

```bash
# See all active subscriptions
redis-cli PUBSUB CHANNELS

# Channels matching a pattern
redis-cli PUBSUB CHANNELS "news:*"

# Count subscribers per channel
redis-cli PUBSUB NUMSUB news:sports news:tech
```

## Summary

Redis Pub/Sub in Python with redis-py uses the `pubsub()` object for subscribing to channels and the `publish()` method for sending messages. For production use, run subscribers in background threads with `run_in_thread()` and use message handler callbacks. Pattern subscriptions with `psubscribe` are useful when you need to listen to groups of related channels. Remember that Pub/Sub messages are not persisted - consider Redis Streams for durable message queuing.
