# How to Use UNLINK Instead of DEL for Large Keys in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, UNLINK, DEL, Memory Management, Large Keys

Description: Learn why Redis DEL blocks on large keys and how to use UNLINK for asynchronous, non-blocking key deletion in production.

---

## The Problem with DEL on Large Keys

The `DEL` command deletes one or more keys synchronously. For simple string keys, this is fast. But for large keys - hashes with millions of fields, large lists, or sorted sets with many members - DEL must:

1. Remove the key from the keyspace
2. Free all the memory for the key's data structure

The memory deallocation happens in the main thread, blocking all other commands. Deleting a large key can block Redis for tens of milliseconds to seconds.

Example of a dangerous deletion:

```bash
# A hash with 1 million fields - blocks Redis during deletion
DEL huge:hash
```

## Measuring Key Size Before Deletion

Before deciding whether to use UNLINK, check the key's size:

```bash
# Check memory usage of a key (in bytes)
redis-cli MEMORY USAGE mykey

# Check number of elements in a collection
redis-cli HLEN myhash
redis-cli LLEN mylist
redis-cli SCARD myset
redis-cli ZCARD myzset
```

General thresholds for concern:
- More than 10,000 elements in a collection
- More than 10 MB of memory usage

## The UNLINK Command

`UNLINK` (introduced in Redis 4.0) unlinks the key from the keyspace atomically but defers the actual memory deallocation to a background thread. It returns immediately, and the memory is freed asynchronously.

```bash
# Non-blocking deletion
UNLINK huge:hash
UNLINK key1 key2 key3
```

The command has the same syntax as `DEL` and returns the number of keys actually deleted.

## When to Use UNLINK vs DEL

```text
Scenario                     | Use
-----------------------------|--------
Simple string or small key   | DEL (faster for trivial data)
Large hash/list/set/zset     | UNLINK
Batch deletion of many keys  | UNLINK
Latency-sensitive production | UNLINK for all deletes
```

When in doubt, use UNLINK. For small keys the overhead is negligible, and for large keys it is essential.

## UNLINK in Application Code

Replace DEL with UNLINK in your application:

```python
import redis

r = redis.Redis(host="localhost", port=6379, password="pass")

# Instead of:
# r.delete("huge:hash")

# Use:
r.unlink("huge:hash")

# Batch unlink
r.unlink("key1", "key2", "key3")
```

```javascript
const Redis = require("ioredis");
const r = new Redis();

// Instead of: await r.del("huge:hash");
await r.unlink("huge:hash");

// Batch
await r.unlink("key1", "key2", "key3");
```

## Lazy Expiration: lazyfree-lazy-expire

Redis can also use lazy (async) deletion for expired keys, evicted keys, and flushing:

```text
# redis.conf
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes
replica-lazy-flush yes
```

These settings make Redis use the background thread for:
- Keys that expire (instead of blocking DEL during expiration)
- Keys evicted by the memory policy
- Background deletions triggered by server operations (e.g., RENAME)
- Flush during full replica resync

Enabling all of these significantly reduces latency spikes caused by large key expirations.

## Verifying Lazy Free Is Working

Monitor the lazy free background queue:

```bash
redis-cli INFO stats | grep lazyfree
```

Output:

```text
lazyfree_pending_objects:0
lazyfreed_objects:1250
```

`lazyfreed_objects` shows how many objects have been freed asynchronously. `lazyfree_pending_objects` shows the current backlog of objects waiting to be freed.

## Deleting a Very Large Key Safely

If you need to delete a very large key (e.g., a hash with 10 million fields), even UNLINK offloads a lot of work to the background thread. For extremely large structures, consider incremental deletion:

```bash
#!/bin/bash
# Delete a large hash incrementally using HSCAN + HDEL
KEY="huge:hash"
cursor=0

while true; do
  result=$(redis-cli HSCAN $KEY $cursor COUNT 1000)
  cursor=$(echo "$result" | head -1)
  fields=$(echo "$result" | tail -n +2 | awk 'NR % 2 == 1')

  if [ -n "$fields" ]; then
    redis-cli HDEL $KEY $fields
  fi

  if [ "$cursor" = "0" ]; then
    break
  fi
done

redis-cli UNLINK $KEY
```

## Summary

Use `UNLINK` instead of `DEL` for large keys to avoid blocking the Redis event loop during memory deallocation. UNLINK removes the key from the keyspace immediately but defers memory freeing to a background thread. Enable `lazyfree-lazy-expire` and related settings to apply the same async behavior to expiration and eviction. For extremely large structures, combine incremental deletion (SCAN + partial DEL) with a final UNLINK for minimum impact on production latency.
