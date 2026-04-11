# How to Build a Simple Message Queue with Redis Lists

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Message Queue, List, Background Job, Async Processing

Description: Learn how to build a simple, reliable message queue using Redis Lists with producer/consumer patterns and blocking pops for background job processing.

---

## Why Redis Lists for Queuing

Redis Lists are implemented as linked lists supporting O(1) push and pop from either end. This makes them ideal for a FIFO queue: producers push to the left (LPUSH) and consumers pop from the right (RPOP), or vice versa.

## Basic Producer/Consumer

```bash
# Producer: push jobs to the queue
LPUSH jobs:email '{"to":"alice@example.com","subject":"Welcome"}'
LPUSH jobs:email '{"to":"bob@example.com","subject":"Reset Password"}'

# Consumer: pop and process
RPOP jobs:email
```

## Python Producer

```python
import redis
import json
import uuid
import time

r = redis.Redis(decode_responses=True)
QUEUE_KEY = "jobs:email"

def enqueue_email(to: str, subject: str, body: str) -> str:
    job_id = str(uuid.uuid4())
    payload = {
        "id": job_id,
        "to": to,
        "subject": subject,
        "body": body,
        "enqueued_at": time.time()
    }
    r.lpush(QUEUE_KEY, json.dumps(payload))
    return job_id

# Enqueue some jobs
enqueue_email("alice@example.com", "Welcome", "Thanks for signing up!")
enqueue_email("bob@example.com", "Password Reset", "Click here to reset.")
```

## Blocking Consumer with BRPOP

Polling with RPOP wastes CPU when the queue is empty. `BRPOP` blocks the connection until a message arrives, with an optional timeout:

```python
def worker():
    print("Worker started, waiting for jobs...")
    while True:
        result = r.brpop(QUEUE_KEY, timeout=5)
        if result is None:
            # Timeout - continue the loop
            continue
        _, raw = result
        job = json.loads(raw)
        process_email(job)

def process_email(job: dict):
    print(f"Sending email to {job['to']}: {job['subject']}")
    # Actual sending logic here

import threading
thread = threading.Thread(target=worker, daemon=True)
thread.start()
```

## Reliable Queue Pattern with BRPOPLPUSH

`BRPOP` removes the job immediately. If the worker crashes mid-processing, the job is lost. Use `BRPOPLPUSH` (or `BLMOVE` in Redis 6.2+) to atomically move jobs to a "processing" list:

```python
PROCESSING_KEY = "jobs:email:processing"

def reliable_worker():
    while True:
        # Atomically move from queue to processing list
        raw = r.brpoplpush(QUEUE_KEY, PROCESSING_KEY, timeout=5)
        if raw is None:
            continue
        job = json.loads(raw)
        try:
            process_email(job)
            # On success, remove from processing list
            r.lrem(PROCESSING_KEY, 1, raw)
        except Exception as e:
            print(f"Job failed: {e}")
            # Re-queue failed job
            r.lpush(QUEUE_KEY, raw)
            r.lrem(PROCESSING_KEY, 1, raw)

# Redis 6.2+ equivalent using BLMOVE
def reliable_worker_blmove():
    while True:
        raw = r.blmove(QUEUE_KEY, PROCESSING_KEY, 5, "RIGHT", "LEFT")
        if raw is None:
            continue
        job = json.loads(raw)
        try:
            process_email(job)
            r.lrem(PROCESSING_KEY, 1, raw)
        except Exception as e:
            print(f"Job failed: {e}")
            r.lpush(QUEUE_KEY, raw)
            r.lrem(PROCESSING_KEY, 1, raw)
```

## Queue Monitoring

```python
def queue_stats() -> dict:
    return {
        "pending": r.llen(QUEUE_KEY),
        "processing": r.llen(PROCESSING_KEY)
    }

def peek_queue(count: int = 5) -> list:
    raw_items = r.lrange(QUEUE_KEY, -count, -1)
    return [json.loads(item) for item in raw_items]
```

## Multiple Queues with Priority Fallback

`BRPOP` accepts multiple keys and returns from the first non-empty one:

```python
def multi_priority_worker():
    while True:
        result = r.brpop(
            ["jobs:critical", "jobs:high", "jobs:normal", "jobs:low"],
            timeout=5
        )
        if result is None:
            continue
        queue_name, raw = result
        job = json.loads(raw)
        print(f"Processing from {queue_name}: {job['id']}")
        process_email(job)
```

## Summary

Redis Lists provide a simple, efficient foundation for message queuing using LPUSH to enqueue and BRPOP to consume in a blocking, CPU-efficient manner. The reliable queue pattern with BRPOPLPUSH/BLMOVE prevents job loss on worker failure by holding jobs in a processing list until completion. For priority handling, `BRPOP` on multiple keys processes higher-priority queues first.
