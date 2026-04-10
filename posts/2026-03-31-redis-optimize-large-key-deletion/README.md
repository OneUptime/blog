# How to Optimize Large Key Deletion in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Memory, Key, UNLINK

Description: Learn how to delete large Redis keys without blocking the server using UNLINK for async deletion, SCAN-based iterative cleanup, and lazy-free configuration.

---

Deleting a Redis key that contains millions of elements (a large list, hash, sorted set, or set) blocks the server for as long as it takes to free that memory. For large keys, this can be hundreds of milliseconds.

## The Problem with DEL on Large Keys

```bash
# Create a large list
redis-cli LPUSH biglist $(seq 1 100000)

# This blocks Redis for the duration
time redis-cli DEL biglist
```

Output:

```text
(integer) 1
real  0m0.543s
```

543ms of server-wide blocking for all other clients.

## Solution: Use UNLINK Instead of DEL

`UNLINK` removes the key from the keyspace immediately and frees memory asynchronously in a background thread:

```bash
UNLINK biglist
# Returns instantly
# Memory freed in background
```

```python
import redis
r = redis.Redis()

# Always prefer unlink for potentially large keys
r.unlink("biglist")
r.unlink("bighash", "bigset", "bigzset")  # Multiple keys at once
```

## Enable Lazy-Free for Automatic Async Deletion

Configure Redis to use lazy-free deletion everywhere:

```text
# /etc/redis/redis.conf
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes
replica-lazy-flush yes
```

With `lazyfree-lazy-server-del yes`, even internal `DEL` calls (like during `SET` on an existing key) use background deletion.

## Iterative Deletion for Collections

For very large hashes or sets where you need to delete field-by-field:

```python
import redis
r = redis.Redis()

# Delete hash fields in batches to avoid blocking
cursor = 0
while True:
    cursor, fields = r.hscan("bighash", cursor, count=500)
    if fields:
        r.hdel("bighash", *fields.keys())
    if cursor == 0:
        break

# Finally delete the empty key
r.unlink("bighash")
```

## Find Large Keys Before Deleting

Identify large keys in advance:

```bash
# Find the biggest key per data type
redis-cli --bigkeys

# Check memory usage of a specific key
redis-cli MEMORY USAGE suspect-key
```

## FLUSHDB ASYNC for Clearing Entire Databases

When you need to clear a whole database:

```bash
# Synchronous - blocks
FLUSHDB

# Asynchronous - returns immediately
FLUSHDB ASYNC
FLUSHALL ASYNC
```

## Verify Lazy-Free Is Working

Check background thread activity:

```bash
redis-cli INFO | grep lazyfree
```

```text
lazyfree_pending_objects:0
lazyfreed_objects:142857
```

`lazyfreed_objects` shows how many objects were freed asynchronously.

## Summary

Optimize large key deletion using `UNLINK` instead of `DEL` for instant non-blocking deletion, enable `lazyfree-*` configuration options for automatic async cleanup, and use `HSCAN`/`SSCAN` to iteratively delete large collections in batches. Monitor `lazyfreed_objects` in `INFO` to confirm lazy-free is active and working.
