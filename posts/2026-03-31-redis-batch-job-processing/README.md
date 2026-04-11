# How to Implement Batch Job Processing with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Queue, Performance

Description: Process Redis queue jobs in batches to reduce overhead, improve throughput, and handle high-volume workloads efficiently.

---

Processing queue jobs one at a time creates per-job overhead - Redis round trips, database connections, and transaction costs multiply with every item. Batch processing pulls multiple jobs at once and processes them together, dramatically improving throughput for high-volume workloads like bulk email, metric aggregation, and data transformation.

## Why Batch Processing?

```text
Single job processing: 1000 jobs x 5ms each = 5 seconds total
Batch processing:      1000 jobs in 10 batches x 50ms = 0.5 seconds total
```

The gains come from amortizing connection overhead, enabling bulk database inserts, and reducing Redis round trips.

## Pulling Multiple Jobs at Once

Use `LMPOP` (Redis 7.0+) or a Lua script to atomically dequeue N items:

```python
import redis
import json
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

QUEUE_KEY = "queue:events"
BATCH_SIZE = 100

def dequeue_batch(batch_size: int = BATCH_SIZE) -> list:
    # Redis 7.0+: LMPOP count items from queue
    result = r.lmpop(1, QUEUE_KEY, direction='RIGHT', count=batch_size)
    if not result:
        return []
    _, items = result
    return [json.loads(item) for item in items]
```

For Redis versions before 7.0, use a Lua script:

```python
BATCH_POP_SCRIPT = r.register_script("""
local items = {}
for i = 1, tonumber(ARGV[1]) do
    local item = redis.call('RPOP', KEYS[1])
    if item == false then break end
    table.insert(items, item)
end
return items
""")

def dequeue_batch_legacy(batch_size: int = BATCH_SIZE) -> list:
    items = BATCH_POP_SCRIPT(keys=[QUEUE_KEY], args=[batch_size])
    return [json.loads(item) for item in items] if items else []
```

## Batch Enqueue with Pipelining

```python
def enqueue_batch(jobs: list):
    pipe = r.pipeline()
    for job in jobs:
        pipe.lpush(QUEUE_KEY, json.dumps(job))
    pipe.execute()
    return len(jobs)
```

## Worker Loop with Batching

```python
def process_batch(jobs: list):
    if not jobs:
        return

    # Group by job type for efficient bulk processing
    by_type = {}
    for job in jobs:
        by_type.setdefault(job["type"], []).append(job)

    for job_type, type_jobs in by_type.items():
        print(f"Processing {len(type_jobs)} {job_type} jobs in batch")
        if job_type == "track_event":
            bulk_insert_events([j["payload"] for j in type_jobs])
        elif job_type == "send_email":
            bulk_send_emails([j["payload"] for j in type_jobs])

def batch_worker_loop(batch_size: int = 100, max_wait: float = 1.0):
    print(f"Batch worker started (batch_size={batch_size})")
    while True:
        batch = dequeue_batch(batch_size)

        if batch:
            process_batch(batch)
        else:
            # Wait briefly before polling again
            time.sleep(max_wait)
```

## Adaptive Batch Size

Dynamically increase batch size under load and decrease it when idle:

```python
def adaptive_batch_worker():
    batch_size = 10
    min_batch = 10
    max_batch = 500

    while True:
        batch = dequeue_batch(batch_size)

        if len(batch) == batch_size:
            # Queue has more items - increase batch size
            batch_size = min(max_batch, batch_size * 2)
        else:
            # Queue draining - scale down
            batch_size = max(min_batch, batch_size // 2)

        if batch:
            process_batch(batch)
        else:
            time.sleep(0.5)
```

## Monitoring Batch Processing

```bash
# Current queue depth
redis-cli LLEN "queue:events"

# Throughput estimate: check queue depth every 5 seconds
watch -n 5 "redis-cli LLEN queue:events"
```

## Summary

Batch job processing with Redis trades per-job simplicity for throughput efficiency. Dequeue multiple items atomically using `LMPOP` or a Lua script, group them by type, and process them together with bulk database operations. Adaptive batch sizing keeps throughput high under load while staying lean when the queue is light. For high-volume event processing, aggregation pipelines, or bulk notifications, this pattern delivers order-of-magnitude throughput improvements over single-item processing.
