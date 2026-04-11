# How to Migrate from Redis Pub/Sub to Redis Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Stream, Migration, Messaging

Description: Learn how to migrate from Redis Pub/Sub to Redis Streams for durable, replayable messaging with consumer groups and persistent message history.

---

## Why Migrate from Pub/Sub to Streams

Redis Pub/Sub is fire-and-forget: if a subscriber is offline when a message is published, the message is lost. Redis Streams persist every message in an append-only log, support consumer groups, allow replaying history, and give you delivery acknowledgement. If your application needs any of those properties, Streams is the right tool.

Key differences to understand before migrating:

- Pub/Sub messages vanish after delivery; Stream messages are stored until trimmed
- Pub/Sub has no concept of acknowledgement; Streams have XACK
- Pub/Sub is broadcast-only; Streams support competing consumers via consumer groups
- Pub/Sub channels are ephemeral; Stream keys are persistent Redis data structures

## Mapping Pub/Sub Concepts to Streams

| Pub/Sub | Streams equivalent |
|---|---|
| Channel | Stream key |
| Publisher (PUBLISH) | Producer (XADD) |
| Subscriber (SUBSCRIBE) | Consumer in a group (XREADGROUP) |
| Message | Entry (field-value pairs) |
| Broadcast | Fan-out via multiple consumer groups |

## Step 1 - Create the Stream and Consumer Group

Before reading, create the consumer group. The `$` special ID means "start from new messages only", matching original Pub/Sub behaviour. Use `0` to read from the beginning of history.

```bash
# Create stream implicitly and consumer group starting at newest messages
XGROUP CREATE notifications my-service $ MKSTREAM

# Or start from the very beginning of history
XGROUP CREATE notifications my-service 0 MKSTREAM
```

## Step 2 - Update Producers

Replace `PUBLISH` with `XADD`. Streams require at least one field-value pair per entry.

Before (Pub/Sub):

```bash
PUBLISH notifications '{"event":"user.signup","userId":"123"}'
```

After (Streams):

```bash
XADD notifications '*' event user.signup userId 123
```

In Python with redis-py:

```python
import redis

r = redis.Redis(host='localhost', port=6379)

# Old Pub/Sub producer
r.publish('notifications', '{"event":"user.signup","userId":"123"}')

# New Streams producer
r.xadd('notifications', {'event': 'user.signup', 'userId': '123'})
```

## Step 3 - Update Consumers

Replace `SUBSCRIBE` / message callbacks with a `XREADGROUP` polling loop.

Before (Pub/Sub subscriber):

```python
import redis

r = redis.Redis(host='localhost', port=6379)
pubsub = r.pubsub()
pubsub.subscribe('notifications')

for message in pubsub.listen():
    if message['type'] == 'message':
        handle(message['data'])
```

After (Streams consumer):

```python
import redis

r = redis.Redis(host='localhost', port=6379)

STREAM = 'notifications'
GROUP = 'my-service'
CONSUMER = 'worker-1'

# Ensure group exists
try:
    r.xgroup_create(STREAM, GROUP, id='$', mkstream=True)
except redis.exceptions.ResponseError:
    pass  # Group already exists

while True:
    # Block up to 2 seconds waiting for new messages
    messages = r.xreadgroup(
        groupname=GROUP,
        consumername=CONSUMER,
        streams={STREAM: '>'},
        count=10,
        block=2000
    )

    if not messages:
        continue

    for stream_name, entries in messages:
        for entry_id, fields in entries:
            handle(fields)
            # Acknowledge the message so it leaves the PEL
            r.xack(STREAM, GROUP, entry_id)
```

## Step 4 - Handle Fan-out (Multiple Services)

Pub/Sub naturally broadcasts to all subscribers. With Streams, create one consumer group per independent service.

```bash
# Service A reads independently
XGROUP CREATE notifications service-a $ MKSTREAM

# Service B reads independently - same stream, separate offset
XGROUP CREATE notifications service-b $ MKSTREAM
```

Both groups receive every message independently, exactly like Pub/Sub broadcast.

## Step 5 - Handle Unacknowledged Messages

Streams track unacknowledged messages in the Pending Entries List (PEL). Build a recovery loop to retry or dead-letter old pending entries.

```python
def recover_pending(r, stream, group, consumer, max_idle_ms=30000):
    # Claim messages idle longer than max_idle_ms
    result = r.xautoclaim(
        stream, group, consumer,
        min_idle_time=max_idle_ms,
        start_id='0-0',
        count=100
    )
    next_id, claimed, deleted = result
    for entry_id, fields in claimed:
        try:
            handle(fields)
            r.xack(stream, group, entry_id)
        except Exception as e:
            print(f'Failed to process {entry_id}: {e}')
```

## Step 6 - Trim the Stream to Control Memory

Unlike Pub/Sub, Streams accumulate data. Add a trim strategy.

```bash
# Keep approximately the last 10,000 entries (approximate trim is faster)
XADD notifications MAXLEN ~ 10000 '*' event ping

# Or trim to exact count
XTRIM notifications MAXLEN 10000
```

In your producer:

```python
r.xadd('notifications', {'event': 'user.signup', 'userId': '123'}, maxlen=10000, approximate=True)
```

## Running Both Systems in Parallel During Migration

To migrate without downtime, dual-publish for a transition period:

```python
def publish_event(r, channel, data):
    # Legacy Pub/Sub (will be removed after all consumers migrated)
    import json
    r.publish(channel, json.dumps(data))

    # New Streams path
    r.xadd(channel, data, maxlen=50000, approximate=True)
```

Once all consumers are migrated and validated, remove the `publish` call.

## Summary

Migrating from Redis Pub/Sub to Redis Streams involves creating consumer groups, replacing `PUBLISH` with `XADD`, and replacing subscriber loops with `XREADGROUP` polling loops with `XACK` acknowledgement. Run both systems in parallel during the transition period, then trim your streams to prevent unbounded memory growth. The result is a more resilient messaging layer with delivery guarantees, replay capability, and support for competing consumers.
