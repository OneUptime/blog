# How to Handle Redis Pub/Sub Message Delivery Guarantees

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Delivery Guarantee, Reliability, Messaging

Description: Learn the delivery guarantees of Redis Pub/Sub, why messages can be lost, and how to add reliability through hybrid Streams and Pub/Sub patterns.

---

Redis Pub/Sub provides fire-and-forget delivery with no persistence. Understanding its delivery limitations - and workarounds - is essential before relying on it for critical messaging.

## What Redis Pub/Sub Guarantees

Redis Pub/Sub guarantees:
- Messages are delivered to all currently connected and subscribed clients
- Ordering within a single publisher-subscriber connection is preserved
- The publisher receives a count of how many clients received the message

Redis Pub/Sub does NOT guarantee:
- Delivery to clients that are not connected at publish time
- At-least-once or exactly-once delivery
- Message persistence across restarts

## Demonstrating Message Loss

```python
import redis
import time
import threading

r_sub = redis.Redis(decode_responses=True)
r_pub = redis.Redis(decode_responses=True)

def subscriber():
    pubsub = r_sub.pubsub()
    pubsub.subscribe('alerts')

    for msg in pubsub.listen():
        if msg['type'] == 'message':
            print(f"Received: {msg['data']}")

# Publish BEFORE subscriber connects - this message is LOST
r_pub.publish('alerts', 'message 1 - LOST')
# returns 0 - no subscribers

# Start subscriber
t = threading.Thread(target=subscriber, daemon=True)
t.start()
time.sleep(0.1)

# Publish while subscriber is connected - delivered
r_pub.publish('alerts', 'message 2 - DELIVERED')
time.sleep(0.1)

# Only message 2 is received; message 1 was permanently lost
```

## The At-Most-Once Problem

Each message is delivered at most once per subscriber. If the subscriber crashes after receiving but before processing, the message is gone:

```bash
# PUBLISH returns delivery count, but 0 means message dropped
PUBLISH critical:alerts "database down"
# (integer) 0  <- no subscribers, message permanently lost
```

## Hybrid Pattern: Streams for Durability, Pub/Sub for Latency

For reliable real-time notifications, use Streams as the durable store and Pub/Sub as the real-time trigger:

```python
def publish_reliable(channel, data):
    # 1. Persist to stream for durability
    stream_id = r_pub.xadd(f'stream:{channel}', data, maxlen=10000, approximate=True)

    # 2. Notify via pub/sub for low-latency wake-up
    r_pub.publish(channel, stream_id)

    return stream_id

def subscribe_reliable(channel, last_seen_id='0-0'):
    pubsub = r_sub.pubsub()
    pubsub.subscribe(channel)

    # On start: catch up on missed messages from stream
    missed = r_sub.xrange(f'stream:{channel}', last_seen_id, '+')
    for entry_id, fields in missed:
        handle_message(entry_id, fields)
        last_seen_id = entry_id

    # Then listen for new messages via pub/sub
    for msg in pubsub.listen():
        if msg['type'] == 'message':
            stream_id = msg['data']
            entries = r_sub.xrange(f'stream:{channel}', stream_id, stream_id)
            if entries:
                handle_message(*entries[0])
                last_seen_id = stream_id
```

## Handling Reconnection Gaps

After reconnecting, catch up on missed messages by reading from the stream:

```python
class ReliableSubscriber:
    def __init__(self, channel):
        self.channel = channel
        self.last_id = '0-0'
        self.r = redis.Redis(decode_responses=True)

    def on_reconnect(self):
        """Call this after a reconnection to catch up"""
        missed = self.r.xrange(
            f'stream:{self.channel}',
            self.last_id,
            '+'
        )
        for entry_id, fields in missed:
            self.process(entry_id, fields)
            self.last_id = entry_id

    def process(self, entry_id, fields):
        print(f"Processing {entry_id}: {fields}")
```

## When Pure Pub/Sub Is Acceptable

Use Redis Pub/Sub without persistence when:
- Message loss is acceptable (UI notifications, live dashboards)
- Messages are ephemeral by nature (cursor position, presence updates)
- You have an independent recovery mechanism

## Summary

Redis Pub/Sub provides at-most-once delivery with no persistence. Messages sent to channels with no subscribers are permanently lost, and disconnected clients miss all messages sent during their absence. For reliable messaging, combine Redis Streams (for durability) with Pub/Sub (for low-latency notifications), allowing reconnecting clients to catch up from the stream.
