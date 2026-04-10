# Redis Pub/Sub Commands Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Command, Cheat Sheet, Messaging

Description: Complete Redis pub/sub commands reference covering PUBLISH, SUBSCRIBE, PSUBSCRIBE, UNSUBSCRIBE, and channel introspection commands.

---

Redis Pub/Sub enables real-time message broadcasting to multiple subscribers. Messages are fire-and-forget - if no subscriber is listening, the message is lost. Here is the complete command reference.

## Publishing Messages

```bash
# Publish a message to a channel
PUBLISH notifications "User 42 logged in"

# Publish structured data (JSON string)
PUBLISH order-events '{"order_id":99,"status":"shipped"}'

# Returns number of subscribers who received the message
PUBLISH my-channel "hello"
# (integer) 3  -> 3 subscribers received it
```

## Subscribing to Channels

```bash
# Subscribe to one or more exact channels
SUBSCRIBE notifications alerts

# Subscribe to a wildcard pattern
PSUBSCRIBE order-*          # matches order-created, order-shipped, etc.
PSUBSCRIBE user:*:events    # matches user:42:events, user:99:events

# Subscribe to shard channels (Redis 7.0+, for Cluster)
SSUBSCRIBE channel1 channel2
```

## Unsubscribing

```bash
# Unsubscribe from specific channels
UNSUBSCRIBE notifications

# Unsubscribe from all channels
UNSUBSCRIBE

# Unsubscribe from specific patterns
PUNSUBSCRIBE order-*

# Unsubscribe from all patterns
PUNSUBSCRIBE

# Shard unsubscribe
SUNSUBSCRIBE channel1
```

## Introspection Commands

```bash
# List active channels (at least one subscriber)
PUBSUB CHANNELS
PUBSUB CHANNELS "order-*"    # filter by pattern

# Count subscribers for specific channels
PUBSUB NUMSUB notifications alerts

# Count active pattern subscriptions
PUBSUB NUMPAT

# List shard channels (Redis 7.0+)
PUBSUB SHARDCHANNELS
PUBSUB SHARDNUMSUB channel1 channel2
```

## Pub/Sub in Client Libraries

```python
# Python (redis-py) example
import redis

r = redis.Redis()

def handle_message(message):
    print(f"Channel: {message['channel']}, Data: {message['data']}")

pubsub = r.pubsub()
pubsub.subscribe(**{'notifications': handle_message})

# Run listener in background thread
thread = pubsub.run_in_thread(sleep_time=0.001)

# Publish from another connection
r.publish('notifications', 'User logged in')
```

```javascript
// Node.js (ioredis) example
const sub = new Redis();
const pub = new Redis();

sub.subscribe('notifications', (err, count) => {
    console.log(`Subscribed to ${count} channels`);
});

sub.on('message', (channel, message) => {
    console.log(`${channel}: ${message}`);
});

pub.publish('notifications', 'User logged in');
```

## Important Behavior Notes

- A client in SUBSCRIBE mode can only use: SUBSCRIBE, SSUBSCRIBE, PSUBSCRIBE, UNSUBSCRIBE, SUNSUBSCRIBE, PUNSUBSCRIBE, PING, RESET, QUIT
- Messages are not persisted - late subscribers miss past messages
- Use Redis Streams instead when you need persistence or replay
- In Redis Cluster, PUBLISH broadcasts to all nodes automatically

## Summary

Redis pub/sub commands are simple: PUBLISH sends to a channel, SUBSCRIBE/PSUBSCRIBE receive from exact channels or patterns. For shard-aware pub/sub in Redis Cluster, use SSUBSCRIBE. PUBSUB introspection commands help monitor active channels and subscriber counts in production.
