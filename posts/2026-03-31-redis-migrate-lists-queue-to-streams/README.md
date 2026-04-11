# How to Migrate from Redis Lists Queue to Redis Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Queue, Migration, Messaging

Description: Learn how to migrate a job queue based on Redis Lists (LPUSH/BRPOP) to Redis Streams for better consumer groups, message tracking, and replay.

---

Many applications use Redis Lists as a simple job queue: producers push with `LPUSH` and consumers pop with `BRPOP`. Redis Streams offer significant improvements: persistent message IDs, consumer groups with acknowledgment, message replay, and pending entry tracking. This guide shows how to migrate.

## Why Migrate to Streams?

| Feature | Lists Queue | Streams |
|---|---|---|
| Message IDs | None | Auto-generated timestamp IDs |
| Acknowledgment | None (pop is destructive) | XACK per consumer group |
| Multiple consumers | Race condition (one gets each msg) | Consumer groups with assignment |
| Message replay | Impossible after pop | Yes, by reading older IDs |
| Pending messages | No tracking | XPENDING shows unacked messages |
| Dead letter handling | Manual | XCLAIM for stuck messages |

## Current Lists-Based Queue

```python
import redis
import json

r = redis.Redis()

# Producer
def enqueue_job(job_data):
    r.lpush("jobs:queue", json.dumps(job_data))

# Consumer (blocking pop)
def consume_jobs():
    while True:
        result = r.brpop("jobs:queue", timeout=5)
        if result:
            _, raw = result
            job = json.loads(raw)
            process_job(job)  # if this crashes, job is lost
```

## Migrating Existing Queue Items

Before switching producers and consumers, migrate any messages currently sitting in the list:

```python
import redis
import json

r = redis.Redis()

def migrate_list_to_stream(list_key, stream_key):
    count = 0
    while True:
        # Non-blocking pop from the right (oldest items first)
        item = r.rpop(list_key)
        if item is None:
            break
        data = json.loads(item)
        # Add to stream with auto-generated ID
        r.xadd(stream_key, data)
        count += 1
    print(f"Migrated {count} items from {list_key} to {stream_key}")

migrate_list_to_stream("jobs:queue", "jobs:stream")
```

## New Streams-Based Producer

```python
import redis
import json
import time

r = redis.Redis()

def enqueue_job(job_data):
    # XADD returns the message ID
    message_id = r.xadd("jobs:stream", job_data)
    return message_id

# Example usage
job_id = enqueue_job({"type": "email", "to": "user@example.com", "subject": "Welcome"})
print(f"Enqueued job: {job_id}")
```

## Create a Consumer Group

```python
# Create consumer group - start from "$" for new messages only
# or "0" to process all existing messages
try:
    r.xgroup_create("jobs:stream", "workers", id="0", mkstream=True)
    print("Consumer group created")
except redis.exceptions.ResponseError as e:
    if "BUSYGROUP" in str(e):
        print("Consumer group already exists")
```

## New Streams-Based Consumer

```python
import redis
import json

r = redis.Redis()

def consume_jobs(consumer_name):
    while True:
        # Read up to 10 messages, block for 5 seconds if empty
        messages = r.xreadgroup(
            groupname="workers",
            consumername=consumer_name,
            streams={"jobs:stream": ">"},
            count=10,
            block=5000
        )

        if not messages:
            continue

        for stream, entries in messages:
            for message_id, data in entries:
                try:
                    process_job(data)
                    # Acknowledge success
                    r.xack("jobs:stream", "workers", message_id)
                except Exception as e:
                    print(f"Failed to process {message_id}: {e}")
                    # Message stays in pending list for retry

def process_job(data):
    print(f"Processing: {data}")
    # your job logic here

consume_jobs("worker-1")
```

## Handle Pending (Unacknowledged) Messages

```python
def reprocess_pending(max_idle_ms=60000):
    # Get messages pending for more than 60 seconds
    pending = r.xpending_range(
        "jobs:stream", "workers",
        min="-", max="+",
        count=100,
        idle=max_idle_ms
    )

    for entry in pending:
        message_id = entry["message_id"]
        # Claim the message to this consumer
        messages = r.xclaim(
            "jobs:stream", "workers", "worker-recovery",
            min_idle_time=max_idle_ms,
            message_ids=[message_id]
        )
        for _, data in messages:
            try:
                process_job(data)
                r.xack("jobs:stream", "workers", message_id)
            except Exception:
                # Move to dead letter stream after N retries
                r.xadd("jobs:dead-letter", data)
                r.xack("jobs:stream", "workers", message_id)
```

## Migration Cutover Plan

1. Deploy new Stream consumer alongside existing List consumer
2. Run `migrate_list_to_stream()` to drain the existing queue into the stream
3. Switch producers to write to the stream instead of the list
4. Shut down old List consumers once the list is empty
5. Monitor with `XLEN jobs:stream` and `XPENDING jobs:stream workers - + 100`

## Summary

Migrating from Redis Lists to Streams requires three steps: migrate existing messages, update producers to use `XADD`, and update consumers to use `XREADGROUP` with acknowledgment. The key benefits are message durability, consumer group fan-out, and visibility into pending/failed messages via `XPENDING`.
