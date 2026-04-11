# How to Configure Redis Lazy Freeing (lazyfree Options)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Configuration, Lazy Freeing, Performance, Latency

Description: Learn how to configure Redis lazyfree options to perform memory deallocation in background threads, reducing latency spikes from large key deletions.

---

## What Is Lazy Freeing in Redis?

Lazy freeing (also called async deletion) allows Redis to deallocate memory for large keys in background threads instead of blocking the main event loop. Without lazy freeing, deleting a large key (like a list with millions of elements) causes Redis to block all other commands while it frees memory.

Redis 4.0 introduced several `lazyfree-lazy-*` options to control which operations trigger lazy (asynchronous) memory deallocation.

## The Problem: Blocking Deletions

Without lazy freeing:

```bash
# Creating a large list
RPUSH biglist val1 val2 val3 ... (1,000,000 elements)

# DEL blocks Redis for hundreds of milliseconds
DEL biglist  # Redis freezes during deallocation
```

With lazy freeing enabled, DEL schedules deallocation in a background thread and returns immediately.

## Configuration Options

```text
# redis.conf

# Lazy free configuration options
lazyfree-lazy-eviction no    # Default
lazyfree-lazy-expire no      # Default
lazyfree-lazy-server-del no  # Default
lazyfree-lazy-user-del no    # Default (Redis 6.0+)
lazyfree-lazy-user-flush no  # Default (Redis 6.2+)
```

## What Each Option Controls

| Option | Triggered By |
|--------|-------------|
| lazyfree-lazy-eviction | Key evictions due to maxmemory policy |
| lazyfree-lazy-expire | Key expirations due to TTL |
| lazyfree-lazy-server-del | Internal Redis operations (e.g., SET overwrite, RENAME) |
| lazyfree-lazy-user-del | User's explicit DEL commands |
| lazyfree-lazy-user-flush | User's FLUSHDB / FLUSHALL commands |

## Recommended Production Configuration

```text
# redis.conf - production lazy freeing

# Enable async for all deletion paths
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes
lazyfree-lazy-user-del yes
lazyfree-lazy-user-flush yes
```

This is safe for most workloads and significantly reduces latency spikes.

## UNLINK vs DEL

Redis also provides the `UNLINK` command as an explicit async delete:

```bash
# Synchronous delete (blocks if key is large)
DEL bigkey

# Asynchronous delete (always async, returns immediately)
UNLINK bigkey

# With lazyfree-lazy-user-del yes, DEL behaves like UNLINK
```

## Monitoring Lazy Freeing Activity

```bash
# Check background deletion activity
redis-cli INFO memory | grep lazyfree

# Key fields:
# lazyfree_pending_objects: objects waiting for background deallocation
# lazyfreed_objects: total objects freed asynchronously (Redis 6.2+)
```

If `lazyfree_pending_objects` grows indefinitely, background threads may be overwhelmed.

## Python Example: Async Deletion in Application Code

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def safe_delete(r, key: str, use_unlink: bool = True):
    """
    Delete a key using UNLINK (async) or DEL based on preference.
    Even with lazyfree options, being explicit is good practice.
    """
    if use_unlink:
        result = r.unlink(key)
    else:
        result = r.delete(key)
    return result

# Populate a large set
r.delete("large_set")
for i in range(100000):
    r.sadd("large_set", f"member:{i}")

print(f"Set size: {r.scard('large_set')}")

# Async deletion via UNLINK
safe_delete(r, "large_set", use_unlink=True)
print("UNLINK sent - deletion happening in background")

# Check if still exists
import time
time.sleep(0.01)
print(f"Key exists: {r.exists('large_set')}")
```

## FLUSHDB and FLUSHALL with ASYNC

Even without lazyfree config, you can explicitly request async flush:

```bash
# Synchronous flush (blocks, can take seconds for large DBs)
FLUSHDB

# Asynchronous flush (returns immediately, background deletion)
FLUSHDB ASYNC

# Same for FLUSHALL
FLUSHALL ASYNC
```

## Impact on Replication

Lazy freeing is transparent to replication. The DEL command is still sent to replicas immediately (they handle their own lazy freeing based on their own config), but the memory on the primary is freed asynchronously.

## Before and After Latency

With a 10 million element hash:

```bash
# Without lazy freeing: DEL can take 500ms+
DEL huge_hash  # Blocks for ~500ms

# With lazyfree-lazy-user-del yes: DEL returns in <1ms
DEL huge_hash  # Returns immediately, background thread frees memory
```

## Summary

Redis lazy freeing options allow asynchronous memory deallocation in background threads, preventing latency spikes from large key deletions. Enable all `lazyfree-lazy-*` options in production for consistent low latency. Use `UNLINK` instead of `DEL` in application code as an explicit async delete, regardless of lazy freeing config. Monitor `lazyfree_pending_objects` to detect background deletion backpressure.
