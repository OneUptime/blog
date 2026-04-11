# How to Set Up Keyspace Notifications in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Keyspace Notification, Configuration, Pub/Sub, Setup

Description: A step-by-step guide to enabling and configuring Redis keyspace notifications, choosing the right event flags, and verifying the setup works correctly.

---

## Overview

Keyspace notifications in Redis let clients subscribe to events that happen to keys - when they are set, deleted, expired, or evicted. This guide covers the complete setup from enabling the feature to verifying it works.

## Step 1: Check Current Configuration

```bash
redis-cli CONFIG GET notify-keyspace-events
```

```text
1) "notify-keyspace-events"
2) ""
```

An empty string means notifications are disabled (default).

## Step 2: Choose Your Event Flags

Decide which events you need to receive. Build your flag string from:

```text
K  - Keyspace events (__keyspace@<db>__ channels)
E  - Keyevent events (__keyevent@<db>__ channels)
g  - Generic: DEL, EXPIRE, RENAME, COPY
$  - String commands: SET, SETEX, INCR, APPEND
l  - List commands: LPUSH, RPOP, LINSERT
s  - Set commands: SADD, SREM, SMOVE
h  - Hash commands: HSET, HDEL, HINCRBY
z  - Sorted set: ZADD, ZREM, ZINCRBY
x  - Expired events (key TTL reached zero)
e  - Evicted events (key removed by maxmemory)
t  - Stream commands
d  - Module key events
A  - Alias for g$lshzxet (everything)
```

Common combinations:

```bash
# Only expiration events (most common use case)
Ex

# Expiration + generic commands (DEL, EXPIRE)
Exg

# Everything
KEA

# String events only (SET, SETEX, etc.)
KE$
```

## Step 3: Enable at Runtime

```bash
# Enable expiration events only
redis-cli CONFIG SET notify-keyspace-events "Ex"

# Verify
redis-cli CONFIG GET notify-keyspace-events
```

```text
1) "notify-keyspace-events"
2) "xE"
```

Note: Redis normalizes the flags (reorders them) in the output.

## Step 4: Enable in redis.conf for Persistence

```text
# /etc/redis/redis.conf
notify-keyspace-events "Ex"
```

Reload:
```bash
sudo systemctl restart redis
# or send SIGHUP for a config reload (not all settings)
redis-cli CONFIG REWRITE  # write current CONFIG SET values to redis.conf
```

## Step 5: Verify Notifications Are Working

Open two terminals:

Terminal 1 - Subscribe to expiration events:
```bash
redis-cli SUBSCRIBE "__keyevent@0__:expired"
```

Terminal 2 - Create a key with a short TTL:
```bash
redis-cli SET testkey "hello" EX 3
```

After 3 seconds, Terminal 1 should receive:
```text
1) "message"
2) "__keyevent@0__:expired"
3) "testkey"
```

## Step 6: Test All Event Types

Subscribe to all events:
```bash
redis-cli PSUBSCRIBE "__key*@0__:*"
```

In another terminal, run various commands:
```bash
redis-cli SET foo bar
redis-cli DEL foo
redis-cli LPUSH mylist item1
redis-cli EXPIRE mylist 1
```

You should see messages like:
```text
1) "pmessage"
2) "__key*@0__:*"
3) "__keyevent@0__:set"
4) "foo"

1) "pmessage"
2) "__key*@0__:*"
3) "__keyspace@0__:foo"
4) "del"
```

## Understanding Channel Naming

**Keyspace channel** (`__keyspace@<db>__:<key>`):
- Subscribe to all events for a specific key
- Message data is the operation name

**Keyevent channel** (`__keyevent@<db>__:<event>`):
- Subscribe to all keys affected by a specific operation
- Message data is the key name

Example:
```text
# When you SET user:1001
# Two messages are published:

Channel: __keyspace@0__:user:1001
Data: set

Channel: __keyevent@0__:set
Data: user:1001
```

## Python Setup Example

```python
import redis
import threading

def setup_keyspace_notifications(host='localhost', port=6379, events='Ex'):
    """Enable keyspace notifications and return a pubsub listener."""
    r = redis.StrictRedis(host=host, port=port, decode_responses=True)

    # Enable notifications
    r.config_set('notify-keyspace-events', events)
    print(f"Enabled keyspace notifications: {events}")

    # Verify
    current = r.config_get('notify-keyspace-events')
    print(f"Current setting: {current}")

    return r

def listen_for_expirations(r, callback):
    """Listen for key expiration events and call callback."""
    pubsub = r.pubsub()
    pubsub.subscribe('__keyevent@0__:expired')

    def worker():
        for message in pubsub.listen():
            if message['type'] == 'message':
                callback(message['data'])

    t = threading.Thread(target=worker, daemon=True)
    t.start()
    return t

# Usage
r = setup_keyspace_notifications(events='Ex')

def on_expiration(key):
    print(f"Expired: {key}")

listen_for_expirations(r, on_expiration)

# Test
import time
r.setex('test:key1', 2, 'value1')
r.setex('test:key2', 3, 'value2')
print("Waiting for expirations...")
time.sleep(4)
```

## Checking Pub/Sub Channel Activity

```bash
# List active channels matching a pattern
redis-cli PUBSUB CHANNELS "__key*"

# Count subscribers per channel
redis-cli PUBSUB NUMSUB "__keyevent@0__:expired"
```

## Notifications Are Not Guaranteed

Important: keyspace notifications use fire-and-forget Pub/Sub. If your subscriber process restarts or is slow, events will be missed. For reliable processing:
- Keep notification handlers lightweight and non-blocking
- Write events to a durable queue (Redis Streams, Kafka) in the handler
- Use consumer groups for reliable delivery to multiple workers

## Summary

Setting up Redis keyspace notifications takes three steps: choose the right event flags based on your use case, enable them via `CONFIG SET notify-keyspace-events`, and subscribe to the appropriate `__keyevent@<db>__:<event>` or `__keyspace@<db>__:<key>` channels. Start with just `Ex` for expiration events to minimize overhead, and verify the setup with a simple TTL test before deploying to production.
