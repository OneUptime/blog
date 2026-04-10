# How to Implement Queue-Based Load Leveling with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Queue, Load Leveling, Backpressure, Architecture

Description: Learn how to use Redis queues to implement load leveling, buffering spiky request volumes and feeding downstream services at a controlled, sustainable rate.

---

Load leveling decouples producers from consumers by placing a queue between them. When traffic spikes, requests accumulate in the queue rather than overwhelming downstream services. Workers drain the queue at a rate the system can sustain. Redis Lists make this pattern straightforward to implement.

## Architecture

```text
Producers (spiky) --> RPUSH --> Redis List --> LPOP --> Workers (steady rate)
```

The queue absorbs bursts. Workers never see more load than they can handle.

## Producer: Enqueuing Work

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

QUEUE = "work:tasks"
MAX_QUEUE_SIZE = 10000  # backpressure limit

def enqueue_task(task: dict) -> bool:
    queue_depth = r.llen(QUEUE)
    if queue_depth >= MAX_QUEUE_SIZE:
        # Apply backpressure - reject new work
        print(f"Queue full ({queue_depth}), rejecting task")
        return False

    r.rpush(QUEUE, json.dumps(task))
    return True

# Simulate a burst of requests
for i in range(500):
    enqueue_task({"task_id": i, "action": "process_order", "user_id": f"u{i}"})

print(f"Queue depth: {r.llen(QUEUE)}")
```

## Worker: Consuming at a Controlled Rate

```python
import time

BATCH_SIZE = 10
WORKER_INTERVAL = 1.0  # seconds between batches

def run_worker(worker_id: str):
    print(f"[{worker_id}] Starting")
    while True:
        batch = []
        for _ in range(BATCH_SIZE):
            result = r.lpop(QUEUE)
            if result is None:
                break
            batch.append(json.loads(result))

        if batch:
            process_batch(worker_id, batch)
        else:
            # Queue empty, wait before polling again
            time.sleep(0.5)

        # Rate control: process at most BATCH_SIZE items per second
        time.sleep(WORKER_INTERVAL)

def process_batch(worker_id: str, batch: list):
    print(f"[{worker_id}] Processing {len(batch)} tasks")
    for task in batch:
        # Simulate work
        time.sleep(0.01)
```

## Monitoring Queue Depth

```python
def get_queue_stats() -> dict:
    depth = r.llen(QUEUE)
    return {
        "queue_depth": depth,
        "is_backlogged": depth > MAX_QUEUE_SIZE * 0.8,
        "estimated_drain_time_seconds": depth / BATCH_SIZE * WORKER_INTERVAL,
    }
```

## Sending Queue Depth Metrics to OneUptime

```python
import requests

def report_queue_depth():
    stats = get_queue_stats()
    requests.post(
        "https://oneuptime.com/api/custom-metrics",
        json={
            "metric": "redis.queue.depth",
            "value": stats["queue_depth"],
            "labels": {"queue": QUEUE}
        },
        headers={"Authorization": "Bearer YOUR_TOKEN"}
    )
```

## Setting Up an Alert for Queue Backlog

```bash
# Check queue depth via redis-cli
redis-cli LLEN work:tasks

# Set up periodic monitoring
watch -n 5 redis-cli LLEN work:tasks
```

## Scaling Workers Dynamically

```python
import threading

def scale_workers(target: int, current_threads: list):
    while len(current_threads) < target:
        wid = f"worker-{len(current_threads)}"
        t = threading.Thread(target=run_worker, args=(wid,), daemon=True)
        t.start()
        current_threads.append(t)
    return current_threads
```

## Summary

Queue-based load leveling with Redis decouples spiky producers from steady consumers using a Redis List as a buffer. Producers apply backpressure when the queue exceeds a threshold, and workers drain at a controlled batch rate. Monitor queue depth as a leading indicator of system overload and scale workers horizontally when depth grows.

