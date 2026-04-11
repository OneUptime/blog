# How to Use Redis Pub/Sub for Simple Messaging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Messaging, Real-Time, SUBSCRIBE, PUBLISH

Description: Learn how to use Redis Pub/Sub to broadcast messages between application components with publishers, subscribers, and channel patterns.

---

## What Is Redis Pub/Sub

Pub/Sub (Publish/Subscribe) is a messaging pattern where publishers send messages to named channels without knowing who will receive them. Subscribers listen on channels and receive messages as they arrive. Redis has built-in Pub/Sub support with no configuration required.

Key characteristics:
- Messages are not persisted - if no one is subscribed, the message is lost
- Subscribers only receive messages published after they subscribe
- One message can reach many subscribers simultaneously

## Basic Usage in redis-cli

Open two terminals to see Pub/Sub in action.

Terminal 1 - Subscribe:

```bash
redis-cli SUBSCRIBE news:sports
# Waiting for messages...
```

Terminal 2 - Publish:

```bash
redis-cli PUBLISH news:sports "Team A wins the championship!"
# (integer) 1   <- number of subscribers that received the message
```

Terminal 1 receives:

```text
1) "message"
2) "news:sports"
3) "Team A wins the championship!"
```

## Subscribe to Multiple Channels

```bash
# Subscribe to multiple channels at once
SUBSCRIBE news:sports news:tech news:weather

# Pattern subscribe (matches news:anything)
PSUBSCRIBE news:*
```

## Publisher in Python

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def publish_event(channel, data):
    message = json.dumps(data)
    subscribers = r.publish(channel, message)
    print(f'Published to {channel}, reached {subscribers} subscribers')

# Publish various events
publish_event('orders:new', {'order_id': 101, 'user': 'alice', 'total': 99.99})
publish_event('inventory:update', {'product_id': 'SKU-42', 'stock': 150})
```

## Subscriber in Python

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def handle_new_order(channel, data):
    print(f'New order received: {data}')

def handle_inventory_update(channel, data):
    print(f'Inventory updated: {data}')

def run_subscriber():
    sub = r.pubsub()
    sub.subscribe('orders:new', 'inventory:update')

    print('Listening for messages...')
    for message in sub.listen():
        if message['type'] == 'message':
            channel = message['channel']
            data = json.loads(message['data'])
            if channel == 'orders:new':
                handle_new_order(channel, data)
            elif channel == 'inventory:update':
                handle_inventory_update(channel, data)

run_subscriber()
```

## Pattern Subscription in Python

```python
def run_pattern_subscriber():
    sub = r.pubsub()
    sub.psubscribe('orders:*')  # matches orders:new, orders:cancelled, etc.

    for message in sub.listen():
        if message['type'] == 'pmessage':
            pattern = message['pattern']
            channel = message['channel']
            data = json.loads(message['data'])
            print(f'Pattern: {pattern}, Channel: {channel}, Data: {data}')
```

## Node.js Example

```javascript
const redis = require('redis');

const publisher = redis.createClient();
const subscriber = redis.createClient();

async function setup() {
  await publisher.connect();
  await subscriber.connect();

  // Subscribe to channel
  await subscriber.subscribe('chat:room:1', (message, channel) => {
    const data = JSON.parse(message);
    console.log(`[${channel}] ${data.user}: ${data.text}`);
  });

  // Publish messages
  await publisher.publish('chat:room:1', JSON.stringify({
    user: 'alice',
    text: 'Hello everyone!'
  }));
}

setup();
```

## Handling Reconnections

Redis client libraries typically handle reconnection automatically, but you need to re-subscribe after reconnecting:

```python
import redis
import time

def run_resilient_subscriber():
    while True:
        try:
            r = redis.Redis(host='localhost', port=6379, decode_responses=True)
            sub = r.pubsub()
            sub.subscribe('my:channel')
            for message in sub.listen():
                if message['type'] == 'message':
                    process(message['data'])
        except redis.ConnectionError:
            print('Connection lost, reconnecting in 5 seconds...')
            time.sleep(5)
```

## Pub/Sub vs. Lists (Queues)

| Feature | Pub/Sub | List Queue |
|---|---|---|
| Message persistence | No | Yes (until consumed) |
| Multiple consumers | All receive the message | Only one receives it |
| Offline consumers | Miss messages | Messages wait in queue |
| Use case | Live notifications, chat | Background job processing |

## Common Use Cases

- Broadcasting configuration changes to all app servers
- Real-time dashboard updates
- Chat systems
- Live score updates in sports apps
- Cache invalidation across multiple servers

```python
# Example: cache invalidation broadcast
def invalidate_cache(key):
    r.publish('cache:invalidate', key)

# All servers subscribe and clear local cache
sub.subscribe('cache:invalidate')
for msg in sub.listen():
    if msg['type'] == 'message':
        local_cache.delete(msg['data'])
```

## Summary

Redis Pub/Sub enables real-time, one-to-many message broadcasting with minimal setup. Publishers send to named channels while subscribers listen and react instantly. Because messages are not persisted, Pub/Sub is best for scenarios where missing a message is acceptable - use Redis Streams or lists instead when guaranteed delivery is required.
