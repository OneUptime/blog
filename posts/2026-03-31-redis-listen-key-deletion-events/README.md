# How to Listen for Key Deletion Events in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Keyspace Notification, Event, Pub/Sub

Description: Configure Redis keyspace notifications to listen for key deletion events and react to DEL, UNLINK, and flush operations in real time.

---

Redis keyspace notifications let you subscribe to server-side events via Pub/Sub. Key deletion events fire when a key is removed via `DEL`, `UNLINK`, FLUSHDB, or when a key expires - a separate event class from generic expiration.

## Enabling Deletion Notifications

Edit `redis.conf` or use `CONFIG SET`:

```bash
# Enable generic commands (g) and keyspace events (K)
# "g" includes DEL, EXPIRE, RENAME, TYPE, PERSIST, etc.
redis-cli CONFIG SET notify-keyspace-events "Kg"
```

The full event flag reference:

```text
K  - Keyspace events (__keyspace@<db>__ prefix)
E  - Keyevent events (__keyevent@<db>__ prefix)
g  - Generic commands (DEL, EXPIRE, RENAME...)
$  - String commands
l  - List commands
s  - Set commands
h  - Hash commands
z  - Sorted set commands
x  - Expired events
e  - Evicted events (maxmemory policy)
d  - Module key type events
t  - Stream commands
m  - Key miss events
A  - Alias for "g$lshzxet"
```

For deletion events, `g` is the relevant flag.

## Subscribing to Deletion Events

**Keyevent channel** - subscribe to a specific event type across all keys:

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Enable notifications first
r.config_set("notify-keyspace-events", "KEg")

pubsub = r.pubsub()
# Subscribe to all DEL events on DB 0
pubsub.subscribe("__keyevent@0__:del")

print("Listening for key deletions...")
for message in pubsub.listen():
    if message["type"] == "message":
        deleted_key = message["data"]
        print(f"Key deleted: {deleted_key}")
```

**Keyspace channel** - subscribe to all events on a specific key:

```python
pubsub.subscribe("__keyspace@0__:user:42")
# Fires for any operation on key "user:42", including del
```

## Handling UNLINK Events

`UNLINK` is the async version of `DEL`. It fires the same `del` event in the keyevent channel:

```bash
# Both of these fire "__keyevent@0__:del"
DEL mykey
UNLINK mykey
```

Your subscriber does not need special handling - both operations produce the same event.

## Reacting to Flush Events

Flush operations fire `flushdb` or `flushall` keyspace events, not individual `del` events per key:

```python
pubsub.subscribe("__keyevent@0__:flushdb")

for message in pubsub.listen():
    if message["type"] == "message":
        print("Database was flushed - invalidate all local caches")
```

## Practical Example: Invalidating a Local Cache on Deletion

```python
import redis
import threading

local_cache = {}

def populate_cache(r):
    keys = r.keys("product:*")
    for key in keys:
        local_cache[key] = r.get(key)

def listen_for_deletions(r):
    ps = r.pubsub()
    ps.psubscribe("__keyevent@0__:del")

    for message in ps.listen():
        if message["type"] == "pmessage":
            key = message["data"]
            if key in local_cache:
                del local_cache[key]
                print(f"Evicted {key} from local cache")

r = redis.Redis(decode_responses=True)
r.config_set("notify-keyspace-events", "KEg")

thread = threading.Thread(target=listen_for_deletions, args=(r,), daemon=True)
thread.start()

populate_cache(r)
# Now local_cache stays in sync when keys are deleted
```

## Distinguishing Explicit Deletion from Expiry

`DEL` fires `del`, while key expiry fires `expired`. Subscribe to both if you need to track all key removals:

```python
pubsub.subscribe("__keyevent@0__:del")
pubsub.subscribe("__keyevent@0__:expired")
```

## Summary

Redis key deletion events are delivered via the keyevent Pub/Sub channel `__keyevent@<db>__:del` when notifications are enabled with the `g` flag. Both `DEL` and `UNLINK` fire the same event, while flush operations use separate `flushdb`/`flushall` events. Subscribe to both `del` and `expired` to catch all forms of key removal in your application.
