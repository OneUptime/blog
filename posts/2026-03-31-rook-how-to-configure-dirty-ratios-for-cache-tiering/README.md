# How to Configure Dirty Ratios for Cache Tiering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Cache Tiering, Dirty Ratio, Writeback

Description: Configure Ceph cache tier dirty ratios to control when modified objects are flushed from the cache back to the backing pool in writeback mode.

---

## What Are Dirty Objects

In Ceph cache tiering with writeback mode, writes go to the fast cache pool first and are later flushed to the slow backing pool. Objects that have been modified in the cache but not yet flushed to the backing pool are called "dirty" objects.

Dirty ratio settings control how much of the cache can contain dirty (unflushed) objects before Ceph starts flushing them to the backing pool.

## Key Dirty Ratio Parameters

### cache_target_dirty_ratio

The fraction of cache capacity at which Ceph begins flushing dirty objects to the backing pool. This is a "soft" threshold - flushing starts gradually:

```bash
# Default: 0.4 (40% of cache can be dirty before flushing starts)
ceph osd pool get mycache cache_target_dirty_ratio

# Set to 30% - more aggressive flushing
ceph osd pool set mycache cache_target_dirty_ratio 0.3
```

### cache_target_dirty_high_ratio

The fraction at which Ceph aggressively flushes dirty objects. Above this threshold, I/O may be throttled to allow flushing to catch up:

```bash
# Default: 0.6 (60% dirty - aggressive flushing and potential throttling)
ceph osd pool set mycache cache_target_dirty_high_ratio 0.6
```

### cache_target_full_ratio

The fraction at which the cache is considered full and evictions begin:

```bash
# Default: 0.8 (80% full triggers evictions)
ceph osd pool set mycache cache_target_full_ratio 0.8
```

### cache_min_flush_age

Minimum age (in seconds) a dirty object must reach before it can be flushed:

```bash
# Objects must be dirty for at least 10 minutes before flushing
ceph osd pool set mycache cache_min_flush_age 600
```

### cache_min_evict_age

Minimum age before a clean object can be evicted:

```bash
# Objects must be in cache for at least 30 minutes before eviction
ceph osd pool set mycache cache_min_evict_age 1800
```

## Complete Writeback Cache Configuration

```bash
# Create pools
ceph osd pool create backing-pool 128 128 replicated
ceph osd pool create fast-cache 64 64 replicated

# Set up tiering
ceph osd tier add backing-pool fast-cache
ceph osd tier cache-mode fast-cache writeback
ceph osd tier set-overlay backing-pool fast-cache

# Size limits
ceph osd pool set fast-cache target_max_bytes 107374182400  # 100 GiB
ceph osd pool set fast-cache target_max_objects 2000000

# Dirty ratio configuration
ceph osd pool set fast-cache cache_target_dirty_ratio 0.4
ceph osd pool set fast-cache cache_target_dirty_high_ratio 0.6
ceph osd pool set fast-cache cache_target_full_ratio 0.8

# Age thresholds
ceph osd pool set fast-cache cache_min_flush_age 600
ceph osd pool set fast-cache cache_min_evict_age 1800

# Hit set configuration
ceph osd pool set fast-cache hit_set_type bloom
ceph osd pool set fast-cache hit_set_count 4
ceph osd pool set fast-cache hit_set_period 3600
ceph osd pool set fast-cache min_read_recency_for_promote 2
ceph osd pool set fast-cache min_write_recency_for_promote 2
```

## Flush Mode Behavior

### Writeback Mode

In writeback mode, writes go to the cache and are flushed asynchronously:

```text
Write -> Cache (dirty) -> Background flush -> Backing pool
Read  -> Cache (if present) or backing pool -> promote
```

### Readproxy/Proxy Modes

These modes do not buffer writes in the cache:

```bash
# Proxy mode: all I/O passes through to backing pool
ceph osd tier cache-mode fast-cache proxy
```

## Tuning for Different Workload Patterns

### Write-Heavy Workload

Lower dirty ratio to flush more frequently, preventing cache from filling with dirty data:

```bash
ceph osd pool set fast-cache cache_target_dirty_ratio 0.2
ceph osd pool set fast-cache cache_target_dirty_high_ratio 0.4
ceph osd pool set fast-cache cache_min_flush_age 300  # flush after 5 minutes
```

### Read-Heavy Workload

Higher dirty ratio is fine since most cache space is used for clean read data:

```bash
ceph osd pool set fast-cache cache_target_dirty_ratio 0.5
ceph osd pool set fast-cache cache_target_full_ratio 0.85
ceph osd pool set fast-cache cache_min_evict_age 3600  # keep for 1 hour
```

## Monitoring Dirty Object Count

```bash
# Check dirty object counts
ceph df detail | grep -A 10 fast-cache

# View cache agent stats
ceph daemon osd.0 perf dump | grep cache

# Watch cache flush activity
watch -n 10 ceph osd pool stats fast-cache
```

## Force Flushing the Cache

To manually trigger a flush (e.g., before removing cache tier):

```bash
# Switch to forward mode (no new promotions)
ceph osd tier cache-mode fast-cache forward

# Flush and evict all objects from cache
rados -p fast-cache cache-flush-evict-all

# Remove overlay and tier
ceph osd tier remove-overlay backing-pool
ceph osd tier remove backing-pool fast-cache
```

## Summary

Dirty ratios in Ceph cache tiering control when modified (dirty) objects are flushed from the fast cache back to the backing pool. The `cache_target_dirty_ratio` sets the soft threshold where flushing begins, while `cache_target_dirty_high_ratio` triggers aggressive flushing. `cache_min_flush_age` prevents premature flushing of recently written objects. Together, these parameters balance write performance (keeping data in fast cache) against durability (ensuring data reaches the backing pool in a timely manner).
