# How to Use Redis as a Write Buffer for Database Writes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Write Buffer, Database, Performance, Write-Behind

Description: Learn how to use Redis as a write buffer to absorb high-frequency writes and batch-flush them to the database, reducing write latency and database load.

---

High-frequency writes - metrics, analytics events, counters, activity logs - can overwhelm a relational database if each event triggers an individual INSERT. Redis as a write buffer (also called write-behind caching) absorbs writes in memory and flushes them to the database in efficient batches.

## Architecture

```text
App --> Redis buffer (fast, in-memory) --> Flusher process --> PostgreSQL / MySQL
```

Writes are durable once in Redis (with AOF). The flusher periodically batches and writes to the database.

## Buffering Writes in Redis

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

WRITE_BUFFER = "writebuffer:events"
MAX_BUFFER_SIZE = 100000

def buffer_write(event: dict) -> bool:
    """Write to Redis buffer. Returns False if buffer is full."""
    if r.llen(WRITE_BUFFER) >= MAX_BUFFER_SIZE:
        print("Write buffer full, applying backpressure")
        return False
    r.rpush(WRITE_BUFFER, json.dumps(event))
    return True

# High-frequency writes
for i in range(10000):
    buffer_write({
        "user_id": f"u{i % 100}",
        "action": "page_view",
        "page": f"/page-{i}",
        "ts": time.time()
    })

print(f"Buffered writes: {r.llen(WRITE_BUFFER)}")
```

## Flusher: Batching to PostgreSQL

```python
import psycopg2
import psycopg2.extras

conn = psycopg2.connect("postgresql://app:secret@localhost/myapp")

FLUSH_BATCH_SIZE = 1000
FLUSH_INTERVAL = 5  # seconds

def flush_to_postgres():
    while True:
        batch = []
        pipeline = r.pipeline()
        for _ in range(FLUSH_BATCH_SIZE):
            pipeline.lpop(WRITE_BUFFER)
        results = pipeline.execute()

        for raw in results:
            if raw is None:
                break
            batch.append(json.loads(raw))

        if batch:
            insert_batch(batch)
            print(f"Flushed {len(batch)} events to PostgreSQL")
        else:
            time.sleep(FLUSH_INTERVAL)

def insert_batch(events: list):
    cursor = conn.cursor()
    psycopg2.extras.execute_values(
        cursor,
        "INSERT INTO page_views (user_id, action, page, ts) VALUES %s",
        [(e["user_id"], e["action"], e["page"], e["ts"]) for e in events]
    )
    conn.commit()
    cursor.close()
```

## Crash-Safe Flush with Processing Key

```python
PROCESSING_BUFFER = "writebuffer:processing"

def safe_flush():
    # Move batch atomically to processing key
    pipeline = r.pipeline()
    for _ in range(FLUSH_BATCH_SIZE):
        pipeline.lmove(WRITE_BUFFER, PROCESSING_BUFFER, "RIGHT", "LEFT")
    pipeline.execute()

    items = r.lrange(PROCESSING_BUFFER, 0, -1)
    if not items:
        return

    batch = [json.loads(raw) for raw in items]
    try:
        insert_batch(batch)
        r.delete(PROCESSING_BUFFER)  # Clear only after successful insert
    except Exception as e:
        print(f"DB flush failed, items stay in processing buffer: {e}")
        # On restart, flusher should re-process PROCESSING_BUFFER first
```

## Monitoring Buffer Depth

```bash
# Check buffer depth
redis-cli LLEN writebuffer:events

# Alert if buffer exceeds threshold
watch -n 5 redis-cli LLEN writebuffer:events
```

## When to Use Write Buffering

```text
Good fit:
- High-frequency low-importance events (analytics, metrics, logs)
- Writes that can tolerate seconds of delay before DB persistence
- Bursty write workloads

Not a good fit:
- Financial transactions requiring immediate DB durability
- Data where loss on Redis failure is unacceptable without additional durability
```

## Summary

Redis as a write buffer absorbs high-frequency writes in memory and flushes them to the database in large, efficient batches. Use `LMOVE` to a processing key before flushing so that a crash does not lose buffered data. Monitor buffer depth as a health metric and apply backpressure when it grows too large.

