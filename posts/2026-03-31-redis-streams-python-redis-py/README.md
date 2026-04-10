# How to Use Redis Streams in Python with redis-py

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, Stream, redis-py, Messaging

Description: Learn how to produce and consume Redis Streams in Python using redis-py, including consumer groups, message acknowledgment, and pending entry handling.

---

Redis Streams provide a persistent, log-based message queue with consumer group semantics. Unlike Pub/Sub, messages survive restarts and can be replayed. This guide covers producing and consuming streams with `redis-py`.

## Writing Messages to a Stream

Use `XADD` to append messages. Each message is a dictionary of field-value pairs:

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Auto-generate ID (timestamp-based)
msg_id = r.xadd("events", {"type": "user.signup", "user_id": "42", "email": "alice@example.com"})
print(f"Added message: {msg_id}")  # e.g. 1743465000000-0

# With maxlen to cap stream size
r.xadd("events", {"type": "page.view", "url": "/home"}, maxlen=10000, approximate=True)
```

## Reading Messages

Read the latest messages directly from a stream:

```python
# Read up to 10 messages from the beginning
messages = r.xrange("events", min="-", max="+", count=10)
for msg_id, fields in messages:
    print(msg_id, fields)

# Blocking read that waits indefinitely for new messages
messages = r.xread({"events": "$"}, count=5, block=0)
```

`$` means "only new messages added after this call."

## Consumer Groups

Consumer groups allow multiple workers to share the workload:

```python
# Create group (start reading from the beginning with "0")
try:
    r.xgroup_create("events", "workers", id="0", mkstream=True)
except redis.exceptions.ResponseError as e:
    if "BUSYGROUP" not in str(e):
        raise

# Consumer reads messages
def consume(consumer_name: str):
    while True:
        results = r.xreadgroup(
            groupname="workers",
            consumername=consumer_name,
            streams={"events": ">"},  # ">" means undelivered messages
            count=10,
            block=2000,  # Block for 2 seconds
        )
        if not results:
            continue
        for stream_name, messages in results:
            for msg_id, fields in messages:
                print(f"[{consumer_name}] Processing {msg_id}: {fields}")
                # Acknowledge after processing
                r.xack("events", "workers", msg_id)

consume("worker-1")
```

## Handling Pending Messages

Messages that were delivered but not acknowledged go into the Pending Entry List (PEL). Reclaim them after a timeout:

```python
def reclaim_stale(stream: str, group: str, min_idle_ms: int = 30000):
    pending = r.xpending_range(stream, group, min="-", max="+", count=100, idle=min_idle_ms)
    for entry in pending:
        claimed = r.xclaim(stream, group, "recovery-worker", min_idle_ms, [entry["message_id"]])
        for msg_id, fields in claimed:
            print(f"Reclaimed: {msg_id} {fields}")
            r.xack(stream, group, msg_id)
```

## Getting Stream Info

```python
info = r.xinfo_stream("events")
print(f"Length: {info['length']}")
print(f"First entry: {info['first-entry']}")
print(f"Last entry: {info['last-entry']}")

groups = r.xinfo_groups("events")
for g in groups:
    print(f"Group: {g['name']} - Pending: {g['pending']}")
```

## Summary

Redis Streams in Python use `xadd` to produce messages and `xreadgroup` with `xack` for reliable consumer group consumption. Always acknowledge processed messages and implement a reclaim loop for pending entries to prevent message loss when consumers crash or stall.
