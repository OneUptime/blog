# How to Troubleshoot Redis High Memory Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Performance, Troubleshooting, Optimization

Description: Diagnose and fix Redis high memory usage by analyzing keyspace, finding large keys, tuning maxmemory policies, and optimizing data structures.

---

Redis is an in-memory database, so memory usage is one of the most critical operational concerns. When memory climbs unexpectedly, you need a structured approach to find the cause and reduce usage without impacting application performance.

## Step 1: Understand Current Memory State

```bash
# Get detailed memory report
redis-cli INFO memory

# Key metrics to check:
# used_memory: total allocated by Redis
# used_memory_rss: RSS reported by OS (includes fragmentation)
# mem_fragmentation_ratio: ratio of RSS to used_memory
# maxmemory: configured limit (0 = no limit)
# maxmemory_policy: eviction policy
# mem_allocator: allocator (jemalloc recommended)

redis-cli MEMORY DOCTOR
# Returns a human-readable diagnosis of memory state
```

```bash
# Check if maxmemory is set
redis-cli CONFIG GET maxmemory
# If 0, there is no limit and Redis will use all available RAM

# Check eviction policy
redis-cli CONFIG GET maxmemory-policy
```

## Step 2: Find Large Keys

Large keys are often the root cause of unexpected memory usage:

```bash
# Find the biggest keys
redis-cli --bigkeys

# Sample output:
# Biggest string found 'session:abc123' has 512 bytes
# Biggest list found 'events:stream' has 1000000 items
# Biggest hash found 'user:profile:99' has 500 fields
```

For more precise key-by-key analysis:

```bash
# Use MEMORY USAGE to check specific keys
redis-cli MEMORY USAGE "session:abc123"
redis-cli MEMORY USAGE "events:stream"

# Scan and find keys over a threshold (1MB)
redis-cli --scan | while read key; do
  usage=$(redis-cli MEMORY USAGE "$key" 2>/dev/null)
  if [ "${usage:-0}" -gt 1048576 ]; then
    echo "$usage bytes: $key"
  fi
done | sort -rn | head -20
```

## Step 3: Analyze Key Pattern Distribution

```python
import redis
from collections import defaultdict

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def analyze_keyspace(sample_size=50000):
    pattern_memory = defaultdict(int)
    pattern_count = defaultdict(int)

    for key in r.scan_iter("*", count=1000):
        # Extract key prefix (e.g., "user:123" -> "user:")
        parts = key.split(":")
        prefix = parts[0] + ":" if len(parts) > 1 else key

        mem = r.memory_usage(key) or 0
        pattern_memory[prefix] += mem
        pattern_count[prefix] += 1

        sample_size -= 1
        if sample_size <= 0:
            break

    print(f"{'Pattern':<30} {'Count':>10} {'Memory (MB)':>12}")
    print("-" * 55)
    for prefix in sorted(pattern_memory, key=pattern_memory.get, reverse=True)[:20]:
        mb = pattern_memory[prefix] / 1024 / 1024
        print(f"{prefix:<30} {pattern_count[prefix]:>10} {mb:>12.2f}")

analyze_keyspace()
```

## Step 4: Fix Common Memory Issues

### Keys with No TTL

```bash
# Find keys without expiry (risky - SCAN can be slow on large keyspaces)
redis-cli --scan | while read key; do
  ttl=$(redis-cli TTL "$key")
  if [ "$ttl" -eq -1 ]; then
    echo "No TTL: $key"
  fi
done | head -50

# Set TTL on persistent keys that should expire
redis-cli EXPIRE "session:old123" 3600
```

### High Fragmentation Ratio

```bash
# Check fragmentation
redis-cli INFO memory | grep mem_fragmentation_ratio
# > 1.5 is high; > 2.0 is problematic

# Trigger active defragmentation (Redis 4.0+)
redis-cli CONFIG SET activedefrag yes
redis-cli CONFIG SET active-defrag-threshold-lower 10
redis-cli CONFIG SET active-defrag-threshold-upper 30
```

### Configure Eviction Policy

```bash
# Set maxmemory and eviction policy
redis-cli CONFIG SET maxmemory 4gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Common policies:
# allkeys-lru - evict least recently used keys
# volatile-lru - evict LRU from keys with TTL only
# allkeys-lfu - evict least frequently used
# noeviction - return error when memory full (default)
```

## Step 5: Optimize Data Structures

```bash
# Check if hashes are using listpack encoding (more memory efficient)
redis-cli OBJECT ENCODING user:1001
# "listpack" = compact (Redis 7+); "hashtable" = expanded

# Tune thresholds to keep small hashes compact
redis-cli CONFIG SET hash-max-listpack-entries 128
redis-cli CONFIG SET hash-max-listpack-value 64

# Same for lists, sets, sorted sets
# Note: list-max-listpack-size uses negative values for byte limits
# (-1=4KB, -2=8KB default, -3=16KB, -4=32KB, -5=64KB)
redis-cli CONFIG SET list-max-listpack-size -2
redis-cli CONFIG SET set-max-intset-entries 512
redis-cli CONFIG SET zset-max-listpack-entries 128
```

## Step 6: Monitor Memory Over Time

```bash
# Check memory stats every 5 seconds
watch -n5 'redis-cli INFO memory | grep -E "used_memory_human|mem_fragmentation_ratio|maxmemory_human"'

# Check eviction stats
redis-cli INFO stats | grep -E "evicted_keys|rejected_connections"
```

## Summary

High Redis memory usage is diagnosed by checking `INFO memory` for fragmentation, using `--bigkeys` to find large keys, and scanning key patterns for unexpected growth. Fixes include setting `maxmemory` with an appropriate eviction policy, applying TTLs to transient keys, enabling active defragmentation, and tuning compact encoding thresholds for small data structures.
