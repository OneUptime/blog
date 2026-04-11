# How to Build a FIFO Queue with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Queue, List

Description: Build a simple FIFO (first-in, first-out) queue with Redis Lists using LPUSH and BRPOP for reliable task processing.

---

A FIFO queue processes items in the order they were added - first in, first out. Redis Lists provide the ideal data structure: `LPUSH` adds to the head (left), and `BRPOP` removes and returns from the tail (right). The result is a clean, ordered queue with blocking pop support so workers sleep efficiently rather than busy-polling.

## Basic FIFO Operations

```bash
# Enqueue (push to left)
LPUSH queue:tasks "task_1"
LPUSH queue:tasks "task_2"
LPUSH queue:tasks "task_3"

# Dequeue (pop from right) - FIFO order: task_1, task_2, task_3
RPOP queue:tasks  # returns "task_1"
RPOP queue:tasks  # returns "task_2"
```

## Python Implementation

```python
import redis
import json
import uuid

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

QUEUE_KEY = "queue:tasks"

def enqueue(task_type: str, payload: dict) -> str:
    job = {
        "id": str(uuid.uuid4()),
        "type": task_type,
        "payload": payload,
    }
    r.lpush(QUEUE_KEY, json.dumps(job))
    return job["id"]

def dequeue(timeout: int = 5) -> dict | None:
    result = r.brpop(QUEUE_KEY, timeout=timeout)
    if result:
        _, data = result
        return json.loads(data)
    return None

def queue_length() -> int:
    return r.llen(QUEUE_KEY)
```

## Worker with BRPOP (Blocking Pop)

`BRPOP` blocks the connection until an item is available or the timeout expires, eliminating the need for sleep-based polling:

```python
def run_worker():
    print(f"Worker started, listening on {QUEUE_KEY}")
    while True:
        job = dequeue(timeout=10)  # Block up to 10 seconds
        if job:
            print(f"Processing job {job['id']}: {job['type']}")
            try:
                process_job(job)
            except Exception as e:
                print(f"Job failed: {e}")
                requeue_failed(job)

def process_job(job: dict):
    # Dispatch to job-type-specific handlers
    handlers = {
        "send_email": handle_send_email,
        "resize_image": handle_resize_image,
    }
    handler = handlers.get(job["type"])
    if handler:
        handler(job["payload"])
    else:
        raise ValueError(f"Unknown job type: {job['type']}")
```

## Multiple Workers (Concurrent Consumers)

Multiple workers can consume from the same queue simultaneously - Redis guarantees each job is delivered to exactly one worker:

```python
import threading

def start_worker_pool(num_workers: int = 4):
    threads = []
    for i in range(num_workers):
        t = threading.Thread(target=run_worker, daemon=True, name=f"worker-{i}")
        t.start()
        threads.append(t)
    return threads
```

## Peeking at the Queue Without Removing

```python
def peek_queue(count: int = 10) -> list:
    # LRANGE from right to left to see FIFO order
    items = r.lrange(QUEUE_KEY, -count, -1)
    return [json.loads(item) for item in reversed(items)]
```

## Monitoring the Queue

```bash
# Queue depth
redis-cli LLEN "queue:tasks"

# Peek at next item
redis-cli LINDEX "queue:tasks" -1

# Peek at oldest 5 items in queue order
redis-cli LRANGE "queue:tasks" -5 -1
```

## Summary

Redis Lists provide a zero-configuration FIFO queue with `LPUSH` for enqueuing and `BRPOP` for blocking dequeue. The blocking pop eliminates polling overhead, making workers highly efficient under low load. Multiple workers can consume from the same key safely - Redis ensures each item is delivered exactly once. This pattern is suitable for task queues, event processing, and any scenario requiring ordered, reliable job delivery.
