# How to Use Redis Keyspace Notifications for Event Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Keyspace Notification, Pub/Sub, Event Monitoring, Real-Time

Description: Learn how Redis keyspace notifications publish events to Pub/Sub channels when keys are created, modified, or expired, enabling real-time event-driven architectures.

---

## What Are Keyspace Notifications

Keyspace notifications allow Redis clients to subscribe to Pub/Sub channels and receive events when certain operations happen on keys. Events are published for operations like SET, DEL, EXPIRE, and LPUSH, as well as when keys expire or are evicted.

This enables powerful event-driven patterns without polling.

## Enabling Keyspace Notifications

By default, keyspace notifications are disabled because they consume CPU. Enable them with the `notify-keyspace-events` configuration:

```bash
# Enable all events (K = keyspace, E = keyevent, A = all event types, x = expired, g = generic)
redis-cli CONFIG SET notify-keyspace-events KEA

# Or set specific event types
redis-cli CONFIG SET notify-keyspace-events "Kxg"
```

In `redis.conf`:
```text
notify-keyspace-events "KEA"
```

## Event Type Flags

| Flag | Description |
|------|-------------|
| `K` | Keyspace events (published in `__keyspace@<db>__` channel) |
| `E` | Keyevent events (published in `__keyevent@<db>__` channel) |
| `g` | Generic commands (DEL, EXPIRE, RENAME...) |
| `$` | String commands (SET, SETEX, INCR...) |
| `l` | List commands (LPUSH, RPOP...) |
| `s` | Set commands (SADD, SREM...) |
| `h` | Hash commands (HSET, HDEL...) |
| `z` | Sorted set commands |
| `t` | Stream commands (XADD, XDEL...) |
| `x` | Expired events (when a key's TTL reaches zero) |
| `e` | Evicted events (removed due to maxmemory) |
| `d` | Module key type events |
| `A` | Alias for `g$lshztdxe` (all event types) |

## Two Channel Types

**Keyspace channels** - subscribe to all events for a specific key:
```text
__keyspace@0__:user:1001
```
Publishes the operation name (e.g., "set", "del", "expire").

**Keyevent channels** - subscribe to all keys affected by a specific operation:
```text
__keyevent@0__:expired
```
Publishes the key name.

## Subscribing to Expiration Events

The most common use case is reacting when keys expire:
```bash
# Subscribe to expiration events
redis-cli SUBSCRIBE "__keyevent@0__:expired"
```

```python
import redis

r = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)
pubsub = r.pubsub()
pubsub.subscribe('__keyevent@0__:expired')

print("Listening for key expirations...")
for message in pubsub.listen():
    if message['type'] == 'message':
        expired_key = message['data']
        print(f"Key expired: {expired_key}")
        # Handle the expiration: update a counter, send a notification, etc.
```

## Subscribing to All Key Events with Pattern

Use pattern subscribe to catch all events across all databases:
```python
import redis

r = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)
pubsub = r.pubsub()
pubsub.psubscribe('__keyevent@*__:*')

for message in pubsub.listen():
    if message['type'] == 'pmessage':
        channel = message['channel']  # e.g., __keyevent@0__:set
        key = message['data']
        operation = channel.split(':')[-1]
        db = channel.split('@')[1].split('__')[0]
        print(f"DB {db} | {operation} on key: {key}")
```

## Monitoring Specific Key Patterns

Subscribe to keyspace events for a specific key prefix:
```python
import redis
import threading

r = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)

def monitor_session_keys():
    """Monitor all events on session keys."""
    pubsub = r.pubsub()
    # Subscribe to keyspace events for keys matching session:*
    # Note: we use pattern on keyevent channel to filter by key name
    pubsub.psubscribe('__keyevent@0__:*')

    for message in pubsub.listen():
        if message['type'] == 'pmessage':
            key = message['data']
            if key.startswith('session:'):
                operation = message['channel'].split(':')[-1]
                print(f"Session event: {operation} on {key}")

t = threading.Thread(target=monitor_session_keys, daemon=True)
t.start()

# Test by creating and expiring a session
import time
r.setex('session:user123', 2, 'active')
print("Session created, waiting for expiration...")
time.sleep(3)
```

## Node.js Example: Reacting to Key Expirations

```javascript
const Redis = require('ioredis');

const subscriber = new Redis({ host: 'localhost', port: 6379 });
const publisher = new Redis({ host: 'localhost', port: 6379 });

async function main() {
  // Enable keyspace notifications
  await publisher.config('SET', 'notify-keyspace-events', 'Ex');

  // Subscribe to expired events
  await subscriber.subscribe('__keyevent@0__:expired');

  subscriber.on('message', (channel, key) => {
    if (channel === '__keyevent@0__:expired') {
      console.log(`Key expired: ${key}`);

      // React to expiration
      if (key.startsWith('lock:')) {
        console.log(`Lock released: ${key}`);
        // Notify waiting clients
      } else if (key.startsWith('session:')) {
        console.log(`Session ended: ${key}`);
        // Log out user
      }
    }
  });

  // Create test data
  await publisher.setex('lock:resource1', 5, '1');
  await publisher.setex('session:user456', 3, 'active');

  console.log('Waiting for expirations...');
}

main().catch(console.error);
```

## Performance Considerations

- Keyspace notifications increase CPU usage because Redis must publish to Pub/Sub for every matching operation
- Use narrow event flags (e.g., just `x` for expired, not `A` for everything) to minimize overhead
- In high-throughput environments, consider sampling or using a dedicated replica for notification subscriptions

Monitor the overhead:
```bash
redis-cli INFO stats | grep pubsub
```
```text
pubsub_channels:4
pubsub_patterns:2
pubsub_shardchannels:0
```

## Guaranteed Delivery Caveat

Keyspace notifications use Pub/Sub, which is fire-and-forget. If a subscriber is not connected when an event fires, the event is lost. For reliable event processing, consider:
- Using Redis Streams (`XADD`/`XREAD`) for durable event storage
- Persisting events to a queue before processing

## Summary

Redis keyspace notifications transform Redis into an event-driven system by publishing Pub/Sub messages when keys are created, modified, expired, or evicted. Subscribe to `__keyevent@0__:expired` for expiration events, use pattern subscriptions for broader monitoring, and limit event flags to only what you need to minimize CPU overhead. For guaranteed delivery, complement notifications with Redis Streams.
