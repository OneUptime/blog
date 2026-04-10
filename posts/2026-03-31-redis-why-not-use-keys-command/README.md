# Why You Should Not Use KEYS Command in Production Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Anti-Pattern

Description: Learn why the Redis KEYS command blocks your entire server and how to safely iterate your keyspace using SCAN without impacting production traffic.

---

KEYS is one of the most dangerous Redis commands to run in production. A single call can freeze your Redis server for seconds, dropping requests across your entire application. Yet it appears in tutorials, debugging sessions, and unfortunately production code.

## Why KEYS is Dangerous

Redis is single-threaded. KEYS blocks the event loop while it scans every key in the database:

```bash
# This scans ALL keys and blocks Redis until complete
# On a database with 10M keys, this may take 2-5 seconds
KEYS user:*
```

During those seconds, every other command queued behind KEYS waits. Your application's latency spikes, timeouts cascade, and your monitoring fires. Even a keyspace with 100K keys can cause noticeable latency.

## The Safe Alternative: SCAN

SCAN is cursor-based and non-blocking. It returns a small batch of keys per call:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def scan_keys(pattern: str, count: int = 100):
    """Safely iterate keys matching a pattern without blocking Redis."""
    cursor = 0
    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=count)
        for key in keys:
            yield key
        if cursor == 0:
            break

def process_key(key: str):
    print(f"Processing: {key}")

# Usage
for key in scan_keys("user:session:*"):
    process_key(key)
```

## Count Keys Without KEYS

```python
# Wrong: blocks entire server
# count = len(r.keys("order:*"))

# Right: use SCAN to count without blocking
def count_matching_keys(pattern: str) -> int:
    count = 0
    cursor = 0
    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=1000)
        count += len(keys)
        if cursor == 0:
            break
    return count
```

## Bulk Delete by Pattern

```python
# Never do this in production:
# for key in r.keys("temp:*"):
#     r.delete(key)

# Safe pattern: SCAN + batch delete
def bulk_delete_pattern(pattern: str, batch_size: int = 500):
    cursor = 0
    total_deleted = 0
    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=batch_size)
        if keys:
            deleted = r.delete(*keys)
            total_deleted += deleted
        if cursor == 0:
            break
    return total_deleted
```

## When KEYS is Acceptable

```text
Acceptable uses of KEYS:
- A dedicated replica instance used only for analytics
- A development or staging environment with small keyspaces
- A one-off manual debug session on an empty database

Never acceptable:
- Application code that runs in production
- Scripts called by automated jobs
- Monitoring or health check code
```

## Use Indexes Instead

If you need to look up keys by pattern frequently, maintain your own index:

```python
# On write: register the key in a set
def create_session(user_id: str, session_id: str):
    r.set(f"session:{session_id}", user_id, ex=3600)
    r.sadd(f"user:sessions:{user_id}", session_id)

# On read: look up via the index, not SCAN
def get_user_sessions(user_id: str) -> list:
    return list(r.smembers(f"user:sessions:{user_id}"))
```

## Summary

KEYS blocks Redis's event loop for the duration of the full keyspace scan, making it unacceptable in production. Use SCAN for safe iteration, maintain secondary indexes for frequent pattern lookups, and restrict KEYS to read-only replicas or development environments where blocking is tolerable.
