# How to Implement Poison Pill Pattern with Redis Queues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Queue, Poison Pill, Error Handling, Consumer

Description: Learn how to implement the poison pill pattern with Redis queues to gracefully stop consumer workers and handle messages that repeatedly cause processing failures.

---

"Poison pill" refers to two related patterns: a shutdown signal passed through the queue itself, and a message that repeatedly causes consumer failures (a "bad message"). Redis queues can handle both.

## Use Case 1: Graceful Shutdown via Poison Pill

Instead of killing workers with signals, push a sentinel message onto the queue. Workers check for it and exit cleanly.

```python
import redis
import json

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

POISON_PILL = "__SHUTDOWN__"

def enqueue(message: dict):
    r.rpush("work-queue", json.dumps(message))

def send_shutdown(num_workers: int):
    for _ in range(num_workers):
        r.rpush("work-queue", POISON_PILL)
    print(f"Sent {num_workers} poison pills")

def worker(worker_id: str):
    print(f"[{worker_id}] Starting")
    while True:
        result = r.blpop("work-queue", timeout=10)
        if result is None:
            continue

        _, raw = result

        if raw == POISON_PILL:
            print(f"[{worker_id}] Received shutdown signal, exiting")
            break

        message = json.loads(raw)
        process(worker_id, message)

def process(worker_id: str, message: dict):
    print(f"[{worker_id}] Processing: {message}")
```

## Use Case 2: Handling Bad Messages (Retry Limit)

Some messages cause persistent failures. Track retry counts and move them to a dead-letter queue after N attempts.

```python
MAX_RETRIES = 3
WORK_QUEUE = "work-queue"
DLQ = "dead-letter-queue"

def worker_with_dlq(worker_id: str):
    while True:
        result = r.blpop(WORK_QUEUE, timeout=10)
        if result is None:
            continue

        _, raw = result
        if raw == POISON_PILL:
            break

        envelope = json.loads(raw)
        msg_id = envelope.get("id", "unknown")
        retries = envelope.get("retries", 0)

        try:
            process(worker_id, envelope["data"])
        except Exception as e:
            print(f"[{worker_id}] Failed to process {msg_id}: {e}")
            if retries < MAX_RETRIES:
                envelope["retries"] = retries + 1
                r.rpush(WORK_QUEUE, json.dumps(envelope))
                print(f"Re-queued {msg_id} (attempt {retries + 1})")
            else:
                r.rpush(DLQ, json.dumps({**envelope, "error": str(e)}))
                print(f"Moved {msg_id} to DLQ after {MAX_RETRIES} retries")
```

## Enqueue with Envelope

```python
import uuid

def enqueue_message(data: dict):
    envelope = {
        "id": str(uuid.uuid4()),
        "retries": 0,
        "data": data
    }
    r.rpush(WORK_QUEUE, json.dumps(envelope))
```

## Inspecting the Dead Letter Queue

```bash
# View all DLQ messages
redis-cli LRANGE dead-letter-queue 0 -1

# Count DLQ entries
redis-cli LLEN dead-letter-queue

# Reprocess a DLQ entry manually
redis-cli LMOVE dead-letter-queue work-queue RIGHT LEFT
```

## Running Multiple Workers with Graceful Shutdown

```python
import threading

NUM_WORKERS = 3
threads = [
    threading.Thread(target=worker_with_dlq, args=(f"worker-{i}",))
    for i in range(NUM_WORKERS)
]

for t in threads:
    t.start()

# Later, to shut down all workers
send_shutdown(NUM_WORKERS)

for t in threads:
    t.join()
```

## Summary

The poison pill pattern in Redis queues serves two purposes: pushing a sentinel value through the queue to signal graceful worker shutdown, and tracking message retry counts to route persistently failing messages to a dead-letter queue. Both patterns are simple to implement with JSON envelopes and Redis Lists.

