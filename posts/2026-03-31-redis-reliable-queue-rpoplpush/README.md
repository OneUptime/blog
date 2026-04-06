# How to Implement Reliable Queue Pattern (RPOPLPUSH) in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Queue, Reliability

Description: Implement the Redis reliable queue pattern using BLMOVE or LMOVE, the modern replacement for RPOPLPUSH, to prevent job loss when workers crash during processing.

---

A standard `RPOP`-based queue has a fatal flaw: if a worker crashes after popping a job but before completing it, the job is lost permanently. The reliable queue pattern solves this by atomically moving the job to a "processing" list when a worker claims it. If the worker crashes, the job remains in the processing list and can be recovered.

## The Problem with Simple RPOP

```text
1. Worker calls RPOP -> job removed from queue
2. Worker begins processing
3. Worker CRASHES
4. Job is gone - no recovery possible
```

## The Reliable Queue Pattern

```text
1. BLMOVE or LMOVE job from queue -> processing list (atomic)
2. Worker processes job
3. On success: delete job from processing list
4. On crash: job stays in processing list -> recovery process re-queues it
```

## Implementation

```python
import redis
import json
import uuid
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

QUEUE_KEY = "queue:main"
PROCESSING_KEY = "queue:processing"
PROCESSING_STARTED_KEY = "queue:processing:started"
JOB_TIMEOUT = 300  # 5 minutes before a job is considered stuck

def enqueue(job_type: str, payload: dict) -> str:
    job = {
        "id": str(uuid.uuid4()),
        "type": job_type,
        "payload": payload,
        "enqueued_at": time.time(),
    }
    r.lpush(QUEUE_KEY, json.dumps(job))
    return job["id"]

def claim_job(timeout: int = 10) -> dict | None:
    # Atomically move from queue to processing list
    # BLMOVE source destination timeout RIGHT LEFT (Redis 6.2+)
    data = r.blmove(QUEUE_KEY, PROCESSING_KEY, timeout, 'RIGHT', 'LEFT')
    if data:
        job = json.loads(data)
        r.hset(PROCESSING_STARTED_KEY, job["id"], time.time())
        return job
    return None
```

Note: For Redis versions before 6.2, use `BRPOPLPUSH` (deprecated but available):

```python
def claim_job_legacy(timeout: int = 10) -> dict | None:
    data = r.brpoplpush(QUEUE_KEY, PROCESSING_KEY, timeout)
    if data:
        return json.loads(data)
    return None
```

## Completing a Job

```python
def complete_job(job: dict):
    # Remove from processing list
    removed = r.lrem(PROCESSING_KEY, 1, json.dumps(job))
    if removed:
        r.hdel(PROCESSING_STARTED_KEY, job["id"])
```

## Recovery Worker: Re-queue Stuck Jobs

Run a periodic recovery process to detect and re-queue jobs that have been in the processing list too long:

```python
def recover_stuck_jobs():
    now = time.time()
    items = r.lrange(PROCESSING_KEY, 0, -1)

    for item in items:
        job = json.loads(item)
        claimed_at = float(r.hget(PROCESSING_STARTED_KEY, job['id']) or 0)

        if now - claimed_at > JOB_TIMEOUT:
            print(f"Recovering stuck job: {job['id']}")
            pipe = r.pipeline()
            pipe.lrem(PROCESSING_KEY, 1, item)
            pipe.hdel(PROCESSING_STARTED_KEY, job['id'])
            job['retries'] = job.get('retries', 0) + 1
            pipe.lpush(QUEUE_KEY, json.dumps(job))
            pipe.execute()
```

## Worker Loop

```python
def worker():
    while True:
        job = claim_job(timeout=10)
        if not job:
            continue
        try:
            process_job(job)
            complete_job(job)
        except Exception as e:
            print(f"Job {job['id']} failed: {e}")
            # Job stays in processing list for recovery
```

## Monitoring

```bash
# Jobs waiting
redis-cli LLEN "queue:main"

# Jobs being processed
redis-cli LLEN "queue:processing"

# When each in-flight job was claimed
redis-cli HGETALL "queue:processing:started"

# Inspect stuck jobs
redis-cli LRANGE "queue:processing" 0 -1
```

## Summary

The reliable queue pattern using `BLMOVE` or `LMOVE` (or `BRPOPLPUSH` on older Redis versions) guarantees that jobs are never silently lost when workers crash. By keeping in-flight jobs in a processing list and storing claim timestamps in a side hash, a recovery worker can detect and re-queue any job that has been processing longer than the expected maximum. This is the foundation of production-ready job queues built on Redis.
