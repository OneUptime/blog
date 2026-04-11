# How to Enable Keyspace Notifications in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Keyspace Notification, Event, Pub/Sub, Configuration

Description: Enable Redis keyspace notifications to receive Pub/Sub events when keys are modified, expired, or deleted, and configure which event types to monitor.

---

## What are Keyspace Notifications

Keyspace notifications allow clients to subscribe to Pub/Sub channels that Redis automatically publishes to when certain operations occur on keys. For example, receive an event when a key expires, is set, deleted, or has a specific command executed on it.

Two channel types:

- **Keyspace** (`__keyspace@<db>__:<key>`): events about a specific key
- **Keyevent** (`__keyevent@<db>__:<event>`): keys that had a specific event

## Step 1 - Enable Notifications

By default, keyspace notifications are disabled to avoid performance overhead. Enable them with:

```bash
redis-cli CONFIG SET notify-keyspace-events "KEA"
```

The value is a combination of flags:

| Flag | Meaning |
|---|---|
| K | Keyspace events (prefix `__keyspace@`) |
| E | Keyevent events (prefix `__keyevent@`) |
| g | Generic commands (DEL, EXPIRE, RENAME) |
| $ | String commands (SET, GETSET) |
| l | List commands (LPUSH, RPOP) |
| s | Set commands (SADD, SREM) |
| h | Hash commands (HSET, HDEL) |
| z | Sorted set commands (ZADD, ZREM) |
| x | Expired events (when key TTL reaches 0) |
| d | Module key type events |
| t | Stream commands |
| e | Evicted events (when key is evicted by maxmemory-policy) |
| A | Alias for `g$lshzxet` (all event types except key miss and module events) |

Common configurations:

```bash
# All events
redis-cli CONFIG SET notify-keyspace-events "KEA"

# Only expiry events
redis-cli CONFIG SET notify-keyspace-events "Kx"

# Key set and delete events
redis-cli CONFIG SET notify-keyspace-events "KE$g"

# Eviction and expiry monitoring
redis-cli CONFIG SET notify-keyspace-events "Exe"
```

Persist in `redis.conf`:

```text
notify-keyspace-events KEA
```

## Step 2 - Subscribe to Keyevent Notifications

```bash
# Receive an event whenever ANY key expires in database 0
redis-cli SUBSCRIBE __keyevent@0__:expired
```

```bash
# Receive an event whenever a SET command is executed on any key
redis-cli SUBSCRIBE __keyevent@0__:set
```

## Step 3 - Subscribe to Keyspace Notifications

```bash
# Receive all events for key 'user:123' in database 0
redis-cli SUBSCRIBE __keyspace@0__:user:123
```

When someone runs `SET user:123 "Alice"`, you receive:

```text
1) "message"
2) "__keyspace@0__:user:123"
3) "set"
```

## Step 4 - Listen in Python

```python
import redis

r = redis.Redis(host='localhost', port=6379)

# Enable keyspace notifications if not already set
r.config_set('notify-keyspace-events', 'KEA')

pubsub = r.pubsub()

# Subscribe to all expired events in database 0
pubsub.psubscribe('__keyevent@0__:expired')

print("Listening for expired key events...")
for message in pubsub.listen():
    if message['type'] == 'pmessage':
        expired_key = message['data']
        if isinstance(expired_key, bytes):
            expired_key = expired_key.decode()
        print(f"Key expired: {expired_key}")
```

## Step 5 - Use Pattern Subscriptions for Keyspace

```python
# Receive all events for keys matching 'session:*'
pubsub.psubscribe('__keyspace@0__:session:*')

for message in pubsub.listen():
    if message['type'] == 'pmessage':
        channel = message['channel'].decode()
        event = message['data'].decode()
        # channel is __keyspace@0__:session:abc123
        key = channel.split(':', 1)[1]  # Extract 'session:abc123'
        print(f"Key: {key}, Event: {event}")
```

## Step 6 - Monitor Key Evictions

```python
# Monitor keys evicted by maxmemory-policy
pubsub.subscribe('__keyevent@0__:evicted')

for message in pubsub.listen():
    if message['type'] == 'message':
        evicted_key = message['data'].decode()
        print(f"Key evicted by memory policy: {evicted_key}")
        # Optionally: persist to external store, alert, etc.
```

## Step 7 - Performance Impact

Keyspace notifications have a cost proportional to the event rate. On a busy Redis with millions of SET/GET operations per second, enabling `KEA` (all events) generates equivalent Pub/Sub traffic.

Best practices:

- Enable only the event types you need
- For expiry-only monitoring, use `Ex` (not `KEA`)
- Use a dedicated Redis instance for notification monitoring if throughput is high

```bash
# Check notification overhead
redis-cli INFO stats | grep pubsub_messages
```

## Step 8 - Verify Notifications are Working

```bash
# Terminal 1: subscribe
redis-cli SUBSCRIBE __keyevent@0__:set

# Terminal 2: set a key
redis-cli SET testkey "hello"

# Terminal 1 should receive:
# 1) "message"
# 2) "__keyevent@0__:set"
# 3) "testkey"
```

## Summary

Redis keyspace notifications are disabled by default and must be enabled with `CONFIG SET notify-keyspace-events`. Use keyevent channels (`__keyevent@<db>__:<event>`) to monitor events across all keys, and keyspace channels (`__keyspace@<db>__:<key>`) to monitor all events on a specific key. Enable only the event types your application needs to minimize Pub/Sub overhead, and use pattern subscriptions for monitoring key namespaces.
