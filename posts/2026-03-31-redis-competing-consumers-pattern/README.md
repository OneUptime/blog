# How to Implement Competing Consumers Pattern with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Queue, Consumer Group, Messaging, Python

Description: Learn how to implement the competing consumers pattern with Redis Streams, enabling multiple workers to process messages in parallel without duplicating work.

---

The competing consumers pattern lets multiple worker processes pull from the same queue, each handling a different message. This scales throughput horizontally without any coordination code. Redis Streams with consumer groups is the cleanest way to implement this in Redis.

## Why Redis Streams?

Redis Streams natively support consumer groups where each message is delivered to exactly one consumer in the group. This is the competing consumers pattern out of the box - no custom locking required.

## Setting Up the Stream and Group

```bash
# Create a stream and consumer group
redis-cli XGROUP CREATE jobs mygroup $ MKSTREAM

# Verify
redis-cli XINFO GROUPS jobs
```

## Producer: Adding Jobs

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def enqueue_job(payload: dict):
    msg_id = r.xadd("jobs", payload)
    print(f"Enqueued: {msg_id}")

# Example usage
enqueue_job({"task": "resize_image", "url": "https://example.com/img.png"})
enqueue_job({"task": "send_email", "to": "user@example.com"})
```

## Consumer Worker

```python
import os
import time

WORKER_ID = os.environ.get("WORKER_ID", "worker-1")  # unique per process/pod
GROUP = "mygroup"
STREAM = "jobs"

def process_message(msg_id: str, data: dict):
    print(f"[{WORKER_ID}] Processing {msg_id}: {data}")
    # Do actual work here
    time.sleep(0.1)

def run_worker():
    while True:
        # Read up to 5 messages assigned to this consumer
        results = r.xreadgroup(
            groupname=GROUP,
            consumername=WORKER_ID,
            streams={STREAM: ">"},  # ">" means new, undelivered messages
            count=5,
            block=2000  # wait 2 seconds if empty
        )

        if not results:
            continue

        for stream_name, messages in results:
            for msg_id, data in messages:
                try:
                    process_message(msg_id, data)
                    # Acknowledge after successful processing
                    r.xack(STREAM, GROUP, msg_id)
                except Exception as e:
                    print(f"Failed to process {msg_id}: {e}")
                    # Do not ACK - message stays in PEL for retry

run_worker()
```

## Running Multiple Workers

```bash
# Worker 1
WORKER_ID=worker-1 python worker.py &

# Worker 2
WORKER_ID=worker-2 python worker.py &

# Worker 3
WORKER_ID=worker-3 python worker.py &
```

Each worker picks up different messages. Redis delivers each message to only one consumer in the group.

## Checking Pending Messages

```bash
# View pending (delivered but not ACKed) messages
redis-cli XPENDING jobs mygroup - + 10

# View pending messages for a specific consumer
redis-cli XPENDING jobs mygroup - + 10 worker-1
```

## Reclaiming Stale Messages

```python
def reclaim_stale_messages(idle_ms: int = 30000):
    # Claim messages idle for more than 30 seconds
    messages = r.xautoclaim(
        STREAM, GROUP, WORKER_ID,
        min_idle_time=idle_ms,
        start_id="0-0",
        count=10
    )
    for msg_id, data in messages[1]:
        process_message(msg_id, data)
        r.xack(STREAM, GROUP, msg_id)
```

## Summary

Redis Streams consumer groups implement the competing consumers pattern natively: each message is delivered to exactly one worker, and acknowledgment marks it complete. Multiple workers can be started without coordination code, scaling throughput linearly. Unacknowledged messages stay in the pending list for reclaim after worker failure.

