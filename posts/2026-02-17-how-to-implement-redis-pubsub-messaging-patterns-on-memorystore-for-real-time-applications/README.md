# How to Implement Redis Pub/Sub Messaging Patterns on Memorystore for Real-Time Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Memorystore, Redis, Pub/Sub, Real-Time Messaging

Description: Learn how to implement Redis Pub/Sub messaging patterns on GCP Memorystore for building real-time features like live notifications, chat, and event broadcasting.

---

Redis Pub/Sub is one of the simplest ways to add real-time messaging to your application. A publisher sends a message to a channel, and every subscriber listening on that channel receives it instantly. On GCP, Memorystore for Redis gives you a fully managed Redis instance that handles the operational overhead while you focus on building the messaging logic.

I have used this pattern for everything from live notification systems to chat features and real-time dashboard updates. The latency is typically sub-millisecond within the same region, which makes it feel truly instant from the user's perspective.

## Redis Pub/Sub vs Google Cloud Pub/Sub

Before diving in, let me clarify the difference. Google Cloud Pub/Sub is a managed messaging service with guaranteed delivery, persistence, and exactly-once processing. Redis Pub/Sub is fire-and-forget - if a subscriber is not connected when a message is published, that message is lost. Redis Pub/Sub is the right choice when you need ultra-low latency and can tolerate occasional message loss, such as real-time UI updates, typing indicators, or live cursors.

## Setting Up Memorystore for Redis

Create a Memorystore instance for your Pub/Sub workload:

```bash
# Create a Memorystore Redis instance
# Use the STANDARD tier for high availability with automatic failover
gcloud redis instances create realtime-messaging \
  --size=2 \
  --region=us-central1 \
  --tier=STANDARD_HA \
  --redis-version=redis_7_0 \
  --network=default

# Get the instance details including the IP address
gcloud redis instances describe realtime-messaging \
  --region=us-central1 \
  --format="value(host, port)"
```

Note down the host and port. Memorystore instances are only accessible from within the VPC, so your application needs to be running on GCP (GKE, Cloud Run with VPC connector, Compute Engine, etc.).

## Basic Pub/Sub Pattern

Let's start with the fundamental publisher/subscriber pattern.

Here is a publisher that sends notifications:

```python
# publisher.py
# Publishes real-time notifications to Redis channels
import redis
import json
import time

# Connect to Memorystore Redis
r = redis.Redis(
    host='10.0.0.3',  # Your Memorystore IP
    port=6379,
    decode_responses=True
)

def publish_notification(user_id, notification):
    """Publish a notification to a user-specific channel."""
    channel = f"notifications:{user_id}"
    message = json.dumps({
        "type": notification["type"],
        "title": notification["title"],
        "body": notification["body"],
        "timestamp": time.time(),
    })
    # publish() returns the number of subscribers who received the message
    receivers = r.publish(channel, message)
    print(f"Notification sent to {receivers} subscriber(s) on {channel}")
    return receivers

# Send a notification to user 12345
publish_notification("user_12345", {
    "type": "order_update",
    "title": "Order Shipped",
    "body": "Your order #789 has been shipped and will arrive tomorrow.",
})
```

And a subscriber that listens for notifications:

```python
# subscriber.py
# Listens for real-time notifications on user channels
import redis
import json

r = redis.Redis(
    host='10.0.0.3',
    port=6379,
    decode_responses=True
)

def listen_for_notifications(user_id):
    """Subscribe to a user's notification channel and process messages."""
    pubsub = r.pubsub()
    channel = f"notifications:{user_id}"
    pubsub.subscribe(channel)

    print(f"Listening for notifications on {channel}...")

    # This blocks and yields messages as they arrive
    for message in pubsub.listen():
        if message["type"] == "message":
            notification = json.loads(message["data"])
            print(f"Received: {notification['title']} - {notification['body']}")
            # Process the notification (show in UI, play sound, etc.)

# Start listening for user 12345's notifications
listen_for_notifications("user_12345")
```

## Pattern Matching with PSUBSCRIBE

Use pattern subscriptions to listen to multiple channels at once. This is useful when you want to monitor all messages for a particular category.

```python
# pattern_subscriber.py
# Subscribe to all notification channels using a pattern
import redis
import json

r = redis.Redis(
    host='10.0.0.3',
    port=6379,
    decode_responses=True
)

def monitor_all_notifications():
    """Subscribe to all notification channels using a glob pattern."""
    pubsub = r.pubsub()
    # The * wildcard matches any user_id
    pubsub.psubscribe("notifications:*")

    print("Monitoring all notification channels...")

    for message in pubsub.listen():
        if message["type"] == "pmessage":
            channel = message["channel"]
            user_id = channel.split(":")[1]
            notification = json.loads(message["data"])
            print(f"[{user_id}] {notification['title']}: {notification['body']}")

monitor_all_notifications()
```

## Chat Room Implementation

A practical example of Redis Pub/Sub is a chat room where multiple users communicate in real time.

```python
# chat_server.py
# Real-time chat room using Redis Pub/Sub on Memorystore
import redis
import json
import threading
import time

r = redis.Redis(
    host='10.0.0.3',
    port=6379,
    decode_responses=True
)

class ChatRoom:
    def __init__(self, room_id):
        self.room_id = room_id
        self.channel = f"chat:{room_id}"
        self.pubsub = r.pubsub()
        self.callbacks = []

    def join(self, username, on_message):
        """Join the chat room and start receiving messages."""
        self.callbacks.append(on_message)
        self.pubsub.subscribe(self.channel)

        # Announce the join
        self.send_message("system", f"{username} has joined the room")

        # Start listening in a background thread
        def listen():
            for message in self.pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    for callback in self.callbacks:
                        callback(data)

        thread = threading.Thread(target=listen, daemon=True)
        thread.start()
        return thread

    def send_message(self, username, text):
        """Send a message to the chat room."""
        message = json.dumps({
            "username": username,
            "text": text,
            "timestamp": time.time(),
            "room_id": self.room_id,
        })
        r.publish(self.channel, message)

    def leave(self, username):
        """Leave the chat room."""
        self.send_message("system", f"{username} has left the room")
        self.pubsub.unsubscribe(self.channel)


# Usage example
def print_message(data):
    print(f"[{data['username']}]: {data['text']}")

room = ChatRoom("engineering")
room.join("alice", print_message)
room.send_message("alice", "Hey everyone, the deploy is done!")
```

## WebSocket Integration

In production, you typically connect Redis Pub/Sub to WebSockets so browsers can receive messages.

```python
# websocket_bridge.py
# Bridges Redis Pub/Sub to WebSocket connections using FastAPI
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis
import json
import asyncio

app = FastAPI()

# Use async Redis client for non-blocking operations
redis_client = aioredis.Redis(
    host='10.0.0.3',
    port=6379,
    decode_responses=True
)

@app.websocket("/ws/notifications/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: str):
    """WebSocket endpoint that bridges Redis Pub/Sub to the browser."""
    await websocket.accept()

    # Create an async Pub/Sub subscription
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"notifications:{user_id}")

    try:
        # Forward Redis messages to the WebSocket
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    except WebSocketDisconnect:
        print(f"User {user_id} disconnected")
    finally:
        await pubsub.unsubscribe(f"notifications:{user_id}")
        await pubsub.close()
```

## Scaling Considerations

Redis Pub/Sub has some characteristics you should plan for at scale:

```python
# monitoring.py
# Monitor Pub/Sub channel activity on Memorystore
import redis

r = redis.Redis(host='10.0.0.3', port=6379, decode_responses=True)

def get_pubsub_stats():
    """Get current Pub/Sub statistics from the Redis server."""
    info = r.info("clients")
    stats = {
        # Number of clients in Pub/Sub mode
        "pubsub_subscribers": r.pubsub_numsub(),
        "pubsub_patterns": r.pubsub_numpat(),
        "connected_clients": info.get("connected_clients", 0),
        "blocked_clients": info.get("blocked_clients", 0),
    }
    return stats

# Check the number of subscribers per channel
def get_channel_subscribers():
    """List all active channels and their subscriber counts."""
    channels = r.pubsub_channels("*")
    for channel in channels:
        count = r.pubsub_numsub(channel)
        print(f"Channel: {channel}, Subscribers: {count}")

get_channel_subscribers()
```

Key scaling points to remember:
- Each subscriber receives a copy of every message on its channel, so bandwidth scales linearly with subscribers
- A single Redis instance can handle tens of thousands of connected Pub/Sub clients
- For Memorystore Standard tier, the failover replica also handles Pub/Sub, providing high availability
- If you need message persistence or replay, combine Redis Pub/Sub with Redis Streams

## Adding Message History with Redis Streams

For cases where you need message replay (like showing the last 50 messages when someone joins a chat), combine Pub/Sub with Redis Streams:

```python
# hybrid_messaging.py
# Combines Pub/Sub for real-time delivery with Streams for history
import redis
import json
import time

r = redis.Redis(host='10.0.0.3', port=6379, decode_responses=True)

def send_with_history(channel, message_data):
    """Send a message via Pub/Sub and also store it in a Stream."""
    message_json = json.dumps(message_data)

    # Store in a Stream for history (keeps last 1000 messages)
    stream_key = f"history:{channel}"
    r.xadd(stream_key, {"data": message_json}, maxlen=1000)

    # Publish for real-time delivery
    r.publish(channel, message_json)

def get_message_history(channel, count=50):
    """Retrieve recent message history from the Stream."""
    stream_key = f"history:{channel}"
    # Read the most recent messages
    messages = r.xrevrange(stream_key, count=count)
    return [json.loads(msg[1]["data"]) for msg in reversed(messages)]
```

## Summary

Redis Pub/Sub on Memorystore is ideal for real-time messaging where low latency matters more than guaranteed delivery. Set up a Memorystore instance, use channel naming conventions to organize your messages, and connect subscribers through WebSockets for browser-based applications. For production systems, combine Pub/Sub with Redis Streams when you need message history, monitor subscriber counts to plan capacity, and use the Standard HA tier for automatic failover. The pattern works well for notifications, chat, live dashboards, and any feature where sub-millisecond messaging makes the user experience feel responsive.
