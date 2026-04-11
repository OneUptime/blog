# How to Listen for Key Update Events in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Keyspace Notification, Event, Pub/Sub

Description: Use Redis keyspace notifications to listen for key update events such as SET, HSET, and LPUSH, and trigger reactions when data changes.

---

Redis keyspace notifications can fire on write operations like `SET`, `HSET`, `LPUSH`, and more. This lets you build reactive systems that respond whenever specific keys are modified.

## Enabling Update Notifications

Different data types have separate flags:

```bash
# Enable key update events for strings ($), hashes (h), lists (l),
# sets (s), sorted sets (z), streams (t), and generic commands (g)
# with keyspace (K) and keyevent (E) channels
redis-cli CONFIG SET notify-keyspace-events "EKgslhz$t"
```

Or enable all with the `A` alias:

```bash
redis-cli CONFIG SET notify-keyspace-events "KEA"
```

Note: enabling all notifications adds overhead. Enable only what you need.

## Subscribing to String Updates

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
r.config_set("notify-keyspace-events", "KE$")

pubsub = r.pubsub()
# All SET operations on DB 0
pubsub.subscribe("__keyevent@0__:set")

for message in pubsub.listen():
    if message["type"] == "message":
        key = message["data"]
        new_value = r.get(key)
        print(f"Key '{key}' was set to '{new_value}'")
```

## Watching a Specific Key with Keyspace Events

```python
pubsub.subscribe("__keyspace@0__:config:feature-flags")

for message in pubsub.listen():
    if message["type"] == "message":
        operation = message["data"]  # "set", "del", "expire", etc.
        print(f"config:feature-flags was {operation}")
        if operation == "set":
            reload_feature_flags()
```

## Pattern Subscribe for Prefix-Based Watching

```python
# Watch all updates to user profile keys
pubsub.psubscribe("__keyspace@0__:user:*")

for message in pubsub.listen():
    if message["type"] == "pmessage":
        key = message["channel"].split("__keyspace@0__:")[1]
        operation = message["data"]
        print(f"User key {key}: {operation}")
```

## Reacting to Hash Field Updates

Hash operations use the `hset` event:

```python
r.config_set("notify-keyspace-events", "KEh")
pubsub.subscribe("__keyevent@0__:hset")

for message in pubsub.listen():
    if message["type"] == "message":
        hash_key = message["data"]
        fields = r.hgetall(hash_key)
        print(f"Hash '{hash_key}' updated: {fields}")
```

Note: the notification only tells you which key changed, not which field. You must re-read the hash to see what changed.

## Tracking List Appends

```python
r.config_set("notify-keyspace-events", "KEl")
pubsub.subscribe("__keyevent@0__:lpush")
pubsub.subscribe("__keyevent@0__:rpush")

for message in pubsub.listen():
    if message["type"] == "message":
        list_key = message["data"]
        length = r.llen(list_key)
        print(f"List '{list_key}' now has {length} items")
```

## Performance Considerations

Keyspace notifications increase Redis CPU usage because the server must publish to Pub/Sub for every matching command. Benchmarks show roughly 10-20% overhead when all notifications are enabled on a busy instance:

```bash
# Measure baseline
redis-benchmark -t set,get -q -n 100000

# Enable all notifications
redis-cli CONFIG SET notify-keyspace-events "KEA"

# Measure with notifications active
redis-benchmark -t set,get -q -n 100000
```

Limit the flags to the minimum needed. For update tracking, choose only the data types you actually watch.

## Handling the Lag Between Event and Read

There is a race condition: by the time your subscriber reads a key after receiving a notification, the key may have been updated again. For critical applications, store enough context in the key itself, or use Lua scripts to atomically read and process:

```bash
# Atomic read using Lua
EVAL "return redis.call('GET', KEYS[1])" 1 mykey
```

## Summary

Redis key update notifications fire per-operation-type: `set` for strings, `hset` for hashes, `lpush`/`rpush` for lists, and so on. Enable only the relevant flags (`$`, `h`, `l`, etc.) to minimize overhead. The notification delivers only the key name - you must read the current value separately, keeping the race condition in mind for time-sensitive workflows.
