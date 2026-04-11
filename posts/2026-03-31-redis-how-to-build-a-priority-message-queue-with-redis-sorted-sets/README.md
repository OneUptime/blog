# How to Build a Priority Message Queue with Redis Sorted Sets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Priority Queue, Sorted Set, Message Queue, Background Job

Description: Learn how to build a priority message queue with Redis Sorted Sets where jobs are processed by priority score and timestamp ordering.

---

## Why Sorted Sets for Priority Queues

Redis Sorted Sets store members ordered by a floating-point score. By encoding priority and timestamp into the score, you get a queue that always returns the highest-priority job first, with FIFO ordering within the same priority level.

## Score Encoding Strategy

Combine priority level and timestamp into one score. Higher numbers = higher priority if you use high positive integers for priority and subtract from a large base, or simply use negative numbers for highest priority:

```text
score = priority_level * 1e12 - timestamp
```

Higher `priority_level` produces a higher (less negative) score, so ZPOPMAX returns the most urgent job.

Alternatively, use a simpler scheme: score = (MAX_PRIORITY - priority) * 1e12 + timestamp, then ZPOPMIN.

## Python Implementation

```python
import redis
import json
import uuid
import time

r = redis.Redis(decode_responses=True)
QUEUE_KEY = "pqueue:jobs"

PRIORITY_CRITICAL = 10
PRIORITY_HIGH = 7
PRIORITY_NORMAL = 5
PRIORITY_LOW = 1

def enqueue(payload: dict, priority: int = PRIORITY_NORMAL) -> str:
    job_id = str(uuid.uuid4())
    job = {**payload, "id": job_id, "enqueued_at": time.time(), "priority": priority}
    # Lower score = processed first (ZPOPMIN); encode as (MAX-priority)*1e12 + ts
    score = (20 - priority) * 1e12 + time.time()
    r.zadd(QUEUE_KEY, {json.dumps(job, sort_keys=True): score})
    return job_id

def dequeue() -> dict | None:
    # ZPOPMIN: lowest score = highest priority
    results = r.zpopmin(QUEUE_KEY, count=1)
    if not results:
        return None
    raw, score = results[0]
    return json.loads(raw)

def peek(count: int = 5) -> list:
    raw_items = r.zrange(QUEUE_KEY, 0, count - 1, withscores=True)
    return [{"job": json.loads(raw), "score": score} for raw, score in raw_items]

def queue_size() -> int:
    return r.zcard(QUEUE_KEY)
```

## Blocking Consumer

Sorted Sets don't have a native blocking pop before Redis 5.0. Use `BZPOPMIN` (added in Redis 5.0):

```python
def blocking_worker():
    print("Priority worker started...")
    while True:
        result = r.bzpopmin(QUEUE_KEY, timeout=5)
        if result is None:
            continue
        _, raw, score = result
        job = json.loads(raw)
        print(f"Processing job {job['id']} with priority {job['priority']}")
        handle_job(job)

def handle_job(job: dict):
    # Dispatch based on job type
    job_type = job.get("type")
    if job_type == "email":
        send_email(job)
    elif job_type == "sms":
        send_sms(job)
    else:
        print(f"Unknown job type: {job_type}")
```

## Reliable Processing with Processing Set

Move jobs to a processing set atomically to prevent loss on worker crash:

```python
PROCESSING_KEY = "pqueue:processing"

def dequeue_reliable() -> dict | None:
    while True:
        try:
            pipe = r.pipeline()
            pipe.watch(QUEUE_KEY)
            # Read inside the WATCH so changes are detected
            raw_items = pipe.zrange(QUEUE_KEY, 0, 0)
            if not raw_items:
                pipe.unwatch()
                return None
            raw = raw_items[0]
            now = time.time()
            pipe.multi()
            pipe.zrem(QUEUE_KEY, raw)
            pipe.zadd(PROCESSING_KEY, {raw: now})
            pipe.execute()
            return json.loads(raw)
        except redis.WatchError:
            continue

def complete_job(job: dict):
    raw = json.dumps(job, sort_keys=True)
    r.zrem(PROCESSING_KEY, raw)

def requeue_stuck_jobs(max_age_seconds: int = 300):
    cutoff = time.time() - max_age_seconds
    stuck = r.zrangebyscore(PROCESSING_KEY, "-inf", cutoff, withscores=True)
    for raw, acquired_at in stuck:
        job = json.loads(raw)
        enqueue(job, priority=job.get("priority", PRIORITY_NORMAL))
        r.zrem(PROCESSING_KEY, raw)
```

## Delayed Jobs with Future Timestamp as Score

For scheduled jobs, set the score to the Unix timestamp of when the job should run:

```python
def enqueue_delayed(payload: dict, run_at: float) -> str:
    job_id = str(uuid.uuid4())
    job = {**payload, "id": job_id, "run_at": run_at}
    r.zadd("pqueue:delayed", {json.dumps(job, sort_keys=True): run_at})
    return job_id

def poll_delayed_jobs():
    now = time.time()
    ready = r.zrangebyscore("pqueue:delayed", "-inf", now)
    for raw in ready:
        job = json.loads(raw)
        enqueue(job, priority=job.get("priority", PRIORITY_NORMAL))
        r.zrem("pqueue:delayed", raw)
```

## Example Usage

```python
import threading

# Enqueue jobs with different priorities
enqueue({"type": "email", "to": "cto@example.com", "subject": "Server down"},
        priority=PRIORITY_CRITICAL)
enqueue({"type": "sms", "to": "+1234567890", "body": "OTP: 123456"},
        priority=PRIORITY_HIGH)
enqueue({"type": "email", "to": "newsletter@example.com", "subject": "Weekly digest"},
        priority=PRIORITY_LOW)

# Start worker
t = threading.Thread(target=blocking_worker, daemon=True)
t.start()
```

## Summary

Redis Sorted Sets with composite priority-timestamp scores provide a flexible, high-performance priority queue. BZPOPMIN offers blocking consumption without polling, while moving jobs to a processing set and periodically re-queuing stuck entries prevents data loss. Delayed job scheduling is a natural extension by using future timestamps as scores.
