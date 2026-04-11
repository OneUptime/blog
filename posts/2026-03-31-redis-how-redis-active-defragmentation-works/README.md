# How Redis Active Defragmentation Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Defragmentation, Memory, Performance, Internal

Description: Understand Redis active defragmentation, how memory fragmentation occurs, how the incremental defrag process works, and how to monitor and tune it.

---

## What Is Memory Fragmentation

Memory fragmentation occurs when Redis frees and reallocates many objects of different sizes. The allocator (jemalloc) may be unable to efficiently reuse freed memory, leading to:

- `used_memory_rss` (physical RAM) significantly exceeding `used_memory` (logical usage)
- Wasted physical memory that appears used but is not holding data
- Potential OOM (Out of Memory) situations at lower-than-expected utilization

```bash
# Check fragmentation ratio
redis-cli INFO memory | grep -E "used_memory:|used_memory_rss:|mem_fragmentation_ratio:"

# mem_fragmentation_ratio = used_memory_rss / used_memory
# < 1.0: Redis is using swap (serious problem)
# 1.0 - 1.5: Normal and healthy
# 1.5 - 2.0: Moderate fragmentation
# > 2.0: High fragmentation - consider enabling active defrag
```

## How Fragmentation Happens

```text
Initial state (keys created):
[obj1][obj2][obj3][obj4][obj5][obj6]  <- contiguous

After deleting and re-creating objects of different sizes:
[obj1][FREE][obj3][FREE][FREE][obj6][NEW-obj][NEW-obj2]

Physical memory still allocated:
RSS shows all blocks (including FREE holes) as "used"
```

Common causes:
- Expiring many short-lived keys
- Replacing string values with different sizes
- Using LPUSH/RPUSH then LPOP/RPOP extensively
- Frequent HDEL operations on hashes

## Enabling Active Defragmentation

Active defragmentation (introduced in Redis 4.0) moves live objects to more compact memory locations:

```bash
# Enable active defrag
redis-cli CONFIG SET activedefrag yes

# Verify
redis-cli CONFIG GET activedefrag
```

In redis.conf:
```text
activedefrag yes
```

## Defragmentation Thresholds

```bash
# Minimum fragmentation ratio to start defrag
redis-cli CONFIG GET active-defrag-ignore-bytes
# 100mb (default: don't start defrag if wasted < 100MB)

redis-cli CONFIG GET activedefrag
redis-cli CONFIG GET active-defrag-threshold-lower
# 10 (start defrag when fragmentation exceeds 10%)

redis-cli CONFIG GET active-defrag-threshold-upper
# 100 (use maximum CPU when fragmentation exceeds 100%)
```

Full configuration:

```bash
# Enable
redis-cli CONFIG SET activedefrag yes

# Minimum bytes wasted before starting (100mb default)
redis-cli CONFIG SET active-defrag-ignore-bytes 100mb

# Minimum fragmentation percentage (10% default)
redis-cli CONFIG SET active-defrag-threshold-lower 10

# Maximum fragmentation to use max CPU (100% default)
redis-cli CONFIG SET active-defrag-threshold-upper 100

# Minimum CPU effort for defragmentation (1% default)
redis-cli CONFIG SET active-defrag-cycle-min 1

# Maximum CPU effort for defragmentation (25% default)
redis-cli CONFIG SET active-defrag-cycle-max 25

# Maximum number of set/hash/zset/list fields to scan per cycle
redis-cli CONFIG SET active-defrag-max-scan-fields 1000
```

## How Active Defrag Works

Redis active defragmentation runs incrementally between command processing:

```text
Each server cycle:
1. Check if fragmentation ratio > threshold
2. If yes, allocate new memory block for next object
3. Copy object to new location
4. Update all pointers to the object
5. Free old memory block
6. Repeat for N objects (bounded by CPU budget)
```

Key property: it only moves objects that jemalloc identifies as being in fragmented regions. Uses jemalloc's `je_get_defrag_hint()` function (a custom extension in Redis's bundled jemalloc) to check whether a specific allocation resides in an underutilized slab and would benefit from relocation.

## Monitoring Defragmentation Progress

```bash
# Monitor defrag stats
redis-cli INFO stats | grep -E "active_defrag"

# Sample output:
# active_defrag_running:1          <- 1 if defrag is running
# active_defrag_hits:12345         <- objects successfully moved
# active_defrag_misses:234         <- objects that couldn't be moved
# active_defrag_key_hits:567       <- keys (top-level objects) moved
# active_defrag_key_misses:89      <- keys not moved
```

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost' });

async function monitorDefrag() {
  const memInfo = await redis.info('memory');
  const statsInfo = await redis.info('stats');

  const parseInfo = (info) => {
    return Object.fromEntries(
      info.split('\r\n')
        .filter(line => line.includes(':'))
        .map(line => line.split(':'))
    );
  };

  const mem = parseInfo(memInfo);
  const stats = parseInfo(statsInfo);

  console.log({
    usedMemory: mem.used_memory_human,
    rssMemory: mem.used_memory_rss_human,
    fragmentationRatio: parseFloat(mem.mem_fragmentation_ratio).toFixed(2),
    defragRunning: stats.active_defrag_running,
    defragHits: stats.active_defrag_hits,
    defragMisses: stats.active_defrag_misses,
  });
}

setInterval(monitorDefrag, 5000);
```

## When NOT to Use Active Defrag

```text
Skip active defrag if:
- Fragmentation ratio is < 1.5 (normal range)
- You're running Redis with AOF rewrite or RDB BGSAVE (high fork overhead)
- Your workload requires maximum CPU for commands
- You use Redis on systems with heavy swap usage

Active defrag works best when:
- Fragmentation ratio is consistently > 1.5
- You have CPU headroom (>25% idle)
- Memory is the primary constraint
```

## Manual Memory Optimization Alternative

If fragmentation is severe and active defrag is too slow:

```bash
# Option 1: Restart Redis (clears fragmentation instantly)
# Requires persistence to be configured

# Option 2: DEBUG RELOAD (causes a full memory reallocate)
redis-cli DEBUG RELOAD  # Blocks the server briefly!

# Option 3: OBJECT FREQ / OBJECT ENCODING to understand what's fragmented
redis-cli OBJECT HELP
```

## Summary

Redis active defragmentation incrementally moves live objects to more compact memory locations, reducing the gap between `used_memory` and `used_memory_rss`. Enable it when fragmentation ratio consistently exceeds 1.5 by setting `activedefrag yes` and tuning the CPU budget with `active-defrag-cycle-min` and `active-defrag-cycle-max`. Monitor progress with `INFO stats | grep active_defrag` to verify it is making progress without consuming excessive CPU.
