# How to Implement Work Stealing Pattern with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Queue, Distributed System

Description: Implement the work stealing pattern in Redis where idle workers steal jobs from overloaded workers to balance load across instances.

---

Work stealing is a load balancing strategy where idle workers proactively steal work from overloaded workers rather than waiting for a central scheduler to redistribute. Originally popularized by Java's ForkJoinPool, the pattern maps naturally onto Redis lists. Each worker has its own queue, and idle workers steal from the ends of busy workers' queues.

## Architecture

```text
Worker 1: [job_a, job_b, job_c, job_d]  <- overloaded
Worker 2: []                              <- idle, will steal from Worker 1
Worker 3: [job_x]                         <- lightly loaded

Worker 2 steals job_d from Worker 1's tail (RPOPLPUSH)
```

Each worker pushes new jobs to its own queue's left (`LPUSH`), processes from its own left (`LPOP`), but idle workers steal from other queues' right (`RPOPLPUSH` / `LMOVE ... RIGHT LEFT`).

## Per-Worker Queue Setup

```python
import redis
import uuid
import json
import time
import os

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

WORKER_ID = os.environ.get("WORKER_ID", str(uuid.uuid4())[:8])
MY_QUEUE = f"worker:queue:{WORKER_ID}"
WORKER_REGISTRY = "workers:active"

def register_worker():
    r.sadd(WORKER_REGISTRY, WORKER_ID)
    r.expire(WORKER_REGISTRY, 3600)

def deregister_worker():
    r.srem(WORKER_REGISTRY, WORKER_ID)

def enqueue_local(job_type: str, payload: dict) -> str:
    job = {
        "id": str(uuid.uuid4()),
        "type": job_type,
        "payload": payload,
        "owner": WORKER_ID,
    }
    r.lpush(MY_QUEUE, json.dumps(job))
    return job["id"]
```

## Claiming Work: Local First, then Steal

```python
def claim_job(timeout: int = 1) -> dict | None:
    # Try own queue first
    data = r.lpop(MY_QUEUE)
    if data:
        return json.loads(data)

    # Own queue empty - try stealing from another worker
    stolen_from = steal_job()
    if stolen_from:
        # Job was moved into our queue by LMOVE, pop it for processing
        data = r.lpop(MY_QUEUE)
        if data:
            job = json.loads(data)
            job['stolen_from'] = stolen_from
            return job

    return None

def steal_job() -> str | None:
    all_workers = r.smembers(WORKER_REGISTRY)
    other_workers = [w for w in all_workers if w != WORKER_ID]

    for target_worker in other_workers:
        target_queue = f"worker:queue:{target_worker}"
        queue_len = r.llen(target_queue)

        # Only steal if target has more than 1 job (leave at least 1)
        if queue_len > 1:
            data = r.lmove(target_queue, MY_QUEUE, 'RIGHT', 'LEFT')
            if data:
                print(f"Worker {WORKER_ID} stole a job from {target_worker}")
                return target_worker

    return None
```

## Worker Loop

```python
def worker_loop():
    register_worker()
    print(f"Worker {WORKER_ID} started, queue: {MY_QUEUE}")

    try:
        while True:
            job = claim_job()
            if job:
                process_job(job)
            else:
                time.sleep(0.1)  # Brief idle pause before retrying
    finally:
        deregister_worker()

def process_job(job: dict):
    print(f"Processing {job['id']} (type={job['type']}, owner={job.get('owner')}, stolen_from={job.get('stolen_from', 'none')})")
    # ... actual job processing
```

## Distributing Initial Work to Workers

When new work arrives from an external source, distribute across workers:

```python
def distribute_to_workers(jobs: list):
    all_workers = sorted(r.smembers(WORKER_REGISTRY))
    if not all_workers:
        return

    pipe = r.pipeline()
    for i, job in enumerate(jobs):
        target = all_workers[i % len(all_workers)]
        pipe.lpush(f"worker:queue:{target}", json.dumps(job))
    pipe.execute()
```

## Monitoring Queue Depths

```bash
# View queue depth per worker
for w in $(redis-cli SMEMBERS "workers:active"); do
  echo "Worker $w: $(redis-cli LLEN "worker:queue:$w") jobs"
done
```

## Summary

Work stealing in Redis uses per-worker `LPUSH`/`LPOP` for local work and `LMOVE` to atomically steal from the right end of busy workers' queues. Workers steal only when their own queue is empty and only from workers with more than one pending job. This self-balancing behavior eliminates the need for a central scheduler while maximizing worker utilization across instances.
