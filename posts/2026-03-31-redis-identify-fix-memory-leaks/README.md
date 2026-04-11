# How to Identify and Fix Redis Memory Leaks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Leak, Debugging

Description: Identify Redis memory leaks caused by unbounded key growth, missing TTLs, and client connection accumulation, with diagnostic commands and fixes.

---

Redis memory leaks are almost always application-level problems rather than Redis bugs. The most common causes are keys growing without TTLs, accumulating temporary data, and client-side connection leaks that hold memory on the server.

## Confirming a Leak Exists

A leak shows up as steadily growing `used_memory` that does not decrease after load drops:

```bash
# Watch memory every 5 seconds
watch -n 5 'redis-cli INFO memory | grep used_memory:'
```

Or capture a trend:

```bash
for i in $(seq 1 10); do
  redis-cli INFO memory | grep used_memory:
  sleep 60
done
```

If memory keeps climbing with no corresponding increase in key count, you have fragmentation, not a leak. If key count grows unbounded - that is a leak.

## Diagnosing Key Growth

```bash
# Track keyspace size over time
redis-cli INFO keyspace

# Output:
# db0:keys=1250000,expires=200000,avg_ttl=3600000

# Ratio: if expires << keys, many keys have no TTL
```

Keys with no TTL that accumulate indefinitely are the most common leak pattern:

```python
import redis

r = redis.Redis(decode_responses=True)

def audit_ttl_coverage(r, pattern="*", sample_size=1000):
    no_ttl = 0
    has_ttl = 0
    cursor = 0
    checked = 0

    while checked < sample_size:
        cursor, keys = r.scan(cursor, match=pattern, count=100)
        for key in keys:
            ttl = r.ttl(key)
            if ttl == -1:
                no_ttl += 1
            elif ttl > 0:
                has_ttl += 1
            checked += 1
        if cursor == 0:
            break

    total = no_ttl + has_ttl
    print(f"Keys with no TTL: {no_ttl}/{total} ({100*no_ttl/total:.1f}%)")

audit_ttl_coverage(r, "session:*")
```

## Common Leak Patterns and Fixes

### Pattern 1 - Missing TTL on Session Keys

```python
# Bug: no expiry
r.hset("session:abc123", mapping={"user_id": "42", "created": "2026-01-01"})

# Fix: always set TTL
r.hset("session:abc123", mapping={"user_id": "42", "created": "2026-01-01"})
r.expire("session:abc123", 3600)  # or use a pipeline for atomicity
```

### Pattern 2 - Unbounded Lists/Sets Used as Queues

```python
# Bug: push without consuming or capping
r.rpush("error_log", error_message)  # grows forever

# Fix: cap with LTRIM
pipe = r.pipeline()
pipe.rpush("error_log", error_message)
pipe.ltrim("error_log", -10000, -1)  # keep last 10,000 entries
pipe.execute()
```

### Pattern 3 - Lua Script Memory Accumulation

Loaded scripts are cached in Redis memory:

```bash
# Check script cache size
redis-cli INFO memory | grep used_memory_scripts

# Flush script cache (clients using EVALSHA will need to resend scripts via EVAL)
redis-cli SCRIPT FLUSH
```

### Pattern 4 - Accumulating Sorted Set Members

```python
# Bug: adding members to a leaderboard without pruning
r.zadd("leaderboard:all-time", {user_id: score})

# Fix: prune to top N after each update
pipe = r.pipeline()
pipe.zadd("leaderboard:all-time", {user_id: score})
pipe.zremrangebyrank("leaderboard:all-time", 0, -10001)  # keep top 10,000
pipe.execute()
```

## Finding Keys Without TTL

```bash
# Use SCAN + TTL to find keys missing expiry

redis-cli --scan --pattern "temp:*" | while read key; do
  ttl=$(redis-cli TTL "$key")
  if [ "$ttl" -eq -1 ]; then
    echo "No TTL: $key"
  fi
done
```

## Detecting Client Connection Memory

Each connected client uses ~20-50 KB of server memory:

```bash
redis-cli CLIENT LIST | wc -l
redis-cli INFO clients

# Look for: connected_clients and blocked_clients
```

If client count is very high and growing:

```bash
# Limit connections and disconnect idle clients (idle > 10 minutes)
redis-cli CONFIG SET maxclients 1000
redis-cli CONFIG SET timeout 600
```

## Setting a Memory Ceiling

As a safety net, configure `maxmemory` and an eviction policy:

```bash
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

This evicts least recently used keys when memory is full, preventing OOM crashes while you hunt the root cause.

## Summary

Redis memory leaks are almost always caused by keys without TTLs, unbounded collections, or excessive client connections. Audit TTL coverage with a SCAN-based sample, cap growing collections with LTRIM or ZREMRANGEBYRANK, and set `maxmemory` as a safety net. Use `INFO memory` and `INFO keyspace` together to distinguish a real leak (key count grows) from fragmentation (key count stable but RSS grows).
