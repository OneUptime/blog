# How to Implement Write-Behind Cache Pattern with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Caching, Write-Behind, Cache Patterns, Async

Description: Learn how to implement the write-behind (write-back) cache pattern with Redis, where writes hit the cache immediately and the database is updated asynchronously.

---

## What is the Write-Behind (Write-Back) Pattern?

In the write-behind cache pattern, the application writes only to Redis and returns immediately. A background process asynchronously flushes the dirty cache data to the database at a later time.

```text
Application
    |
    v
  Redis (write) ---> return success immediately
    |
    v (async, later)
  Database flush
```

This gives very low write latency because the application does not wait for the database. The trade-off is that data may be lost if Redis crashes before the background flush completes.

## When to Use Write-Behind

- Write-intensive workloads (counters, analytics events, IoT sensor data)
- Scenarios where some data loss is tolerable (view counts, game scores, activity logs)
- Applications that need sub-millisecond write responses
- When you want to batch many small writes into fewer, larger DB writes

## When NOT to Use Write-Behind

- Financial transactions where every write must be durable
- Data where consistency guarantees are contractually required
- Small datasets where write-through is fast enough

## Python Implementation with Background Flush

### Queue Dirty Keys in a Redis List

```python
import redis
import json
import time
import threading
from typing import Optional

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

DIRTY_QUEUE = "writebehind:dirty"
CACHE_TTL   = 3600

def write_behind(key: str, data: dict) -> None:
    """Write to cache only, queue key for async DB flush."""
    pipe = r.pipeline()
    pipe.setex(key, CACHE_TTL, json.dumps(data))
    pipe.lpush(DIRTY_QUEUE, key)
    pipe.execute()

def read_cache(key: str) -> Optional[dict]:
    """Read from cache; fall through to DB on miss."""
    cached = r.get(key)
    if cached:
        return json.loads(cached)
    return None

def flush_worker(batch_size: int = 50, interval: float = 1.0) -> None:
    """Background worker that flushes dirty keys to the database."""
    while True:
        dirty_keys = []

        for _ in range(batch_size):
            key = r.rpop(DIRTY_QUEUE)
            if key is None:
                break
            dirty_keys.append(key)

        if dirty_keys:
            _flush_to_db(dirty_keys)

        time.sleep(interval)

def _flush_to_db(keys: list) -> None:
    """Batch flush a list of cache keys to the database."""
    pipe = r.pipeline()
    for key in keys:
        pipe.get(key)
    values = pipe.execute()

    records = []
    for key, value in zip(keys, values):
        if value:
            entity_id = key.split(":")[-1]
            records.append((entity_id, json.loads(value)))

    if records:
        db_batch_upsert(records)

def db_batch_upsert(records: list) -> None:
    """Batch upsert records into the database."""
    # INSERT INTO entities (id, data) VALUES ... ON CONFLICT DO UPDATE
    for entity_id, data in records:
        print(f"Flushing {entity_id} to DB: {data}")
```

### Starting the Background Worker

```python
import threading

def start_flush_worker():
    t = threading.Thread(target=flush_worker, args=(50, 2.0), daemon=True)
    t.start()

# At application startup
start_flush_worker()
```

## Node.js Implementation

```javascript
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });
await client.connect();

const DIRTY_QUEUE = 'writebehind:dirty';

async function writeBehind(key, data) {
  const multi = client.multi();
  multi.setEx(key, 3600, JSON.stringify(data));
  multi.lPush(DIRTY_QUEUE, key);
  await multi.exec();
}

async function flushBatch() {
  const keys = [];
  for (let i = 0; i < 100; i++) {
    const key = await client.rPop(DIRTY_QUEUE);
    if (!key) break;
    keys.push(key);
  }

  if (keys.length === 0) return;

  const values = await Promise.all(keys.map(k => client.get(k)));
  const records = keys
    .map((key, i) => ({ key, value: values[i] }))
    .filter(({ value }) => value !== null)
    .map(({ key, value }) => ({ id: key.split(':').pop(), data: JSON.parse(value) }));

  await dbBatchUpsert(records);
  console.log(`Flushed ${records.length} records to DB`);
}

// Run flush every 2 seconds
setInterval(flushBatch, 2000);

async function dbBatchUpsert(records) {
  // INSERT ... ON CONFLICT DO UPDATE
  for (const { id, data } of records) {
    console.log(`DB upsert: ${id}`, data);
  }
}
```

## Deduplicating Dirty Queue Entries

When the same key is updated multiple times before the flush runs, it should only be written to the DB once. Use a Redis Set instead of a List:

```python
DIRTY_SET = "writebehind:dirty_set"

def write_behind_dedup(key: str, data: dict) -> None:
    """Write to cache and add key to dirty set (no duplicates)."""
    pipe = r.pipeline()
    pipe.setex(key, CACHE_TTL, json.dumps(data))
    pipe.sadd(DIRTY_SET, key)
    pipe.execute()

def flush_dedup_worker(batch_size: int = 50) -> None:
    """Pop a batch of unique dirty keys and flush them."""
    keys = r.spop(DIRTY_SET, batch_size)
    if not keys:
        return

    pipe = r.pipeline()
    for key in keys:
        pipe.get(key)
    values = pipe.execute()

    records = [
        (key.split(":")[-1], json.loads(val))
        for key, val in zip(keys, values)
        if val
    ]

    if records:
        db_batch_upsert(records)
```

## Handling Redis Crash Recovery

To avoid losing dirty writes on Redis restart, persist the dirty queue:

```bash
# In redis.conf - enable AOF persistence
appendonly yes
appendfsync everysec
```

Or use a separate durable store for the dirty queue (e.g., a database table or a message queue like Redis Streams).

## Summary

The write-behind pattern maximizes write throughput by decoupling the application write from the database write - the app writes to Redis and returns immediately while a background worker asynchronously flushes dirty keys to the database in batches. This pattern excels for write-heavy workloads like counters and activity logs, but requires careful handling of Redis persistence and crash recovery to avoid data loss.
