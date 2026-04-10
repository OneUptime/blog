# How to Configure Dirty Ratios for Cache Tiering in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CacheTiering, Storage, Performance

Description: Learn how to configure cache_target_dirty_ratio and cache_target_dirty_high_ratio in Ceph to control when dirty objects are flushed from the writeback cache to the backing pool.

---

In Ceph writeback cache mode, "dirty" objects are objects that have been written to the cache pool but not yet flushed to the backing pool. The dirty ratio settings control when Ceph begins flushing dirty objects to prevent the cache from becoming full of unflushed data that is at risk if the cache pool fails.

## What Are Dirty Objects?

When a client writes data in writeback mode:
1. Data lands on the cache pool (SSD)
2. Client receives acknowledgment immediately
3. Data is marked "dirty" - it exists in cache but not backing pool
4. Dirty objects are flushed to the backing pool asynchronously
5. Once flushed, objects are marked "clean"

The "dirty ratio" is the fraction of cache capacity occupied by dirty (unflushed) objects.

## Dirty Ratio Parameters

```bash
# Begin flushing when dirty objects exceed 40% of cache capacity
ceph osd pool set cache-pool cache_target_dirty_ratio 0.4

# Aggressively flush when dirty objects exceed 60% of cache capacity
ceph osd pool set cache-pool cache_target_dirty_high_ratio 0.6
```

The two thresholds create a graduated response:
- Below `cache_target_dirty_ratio`: No flushing pressure, normal operation
- Between the two ratios: Flush begins at a reduced rate
- Above `cache_target_dirty_high_ratio`: Flush at maximum rate, new writes may be throttled

## Viewing Current Dirty Object Count

```bash
ceph df detail | grep cache-pool
```

```text
POOL        STORED   USED     OBJECTS  DIRTY
cache-pool  400 GiB  480 GiB  102400   40960
```

The `DIRTY` column shows the count of unflushed objects. If the number of dirty objects relative to total objects approaches `cache_target_dirty_high_ratio`, expect write throttling.

## Calculating Safe Dirty Ratio Values

For a cache pool with `target_max_bytes = 500 GiB`:

```text
cache_target_dirty_ratio = 0.4
  --> Start flushing when 200 GiB of dirty objects exist

cache_target_dirty_high_ratio = 0.6
  --> Aggressive flush when 300 GiB of dirty objects exist

gap = 100 GiB of dirty accumulation headroom before stalls
```

The gap between the two ratios should be large enough to allow the flush daemon to catch up before write throttling begins. A 10-20% gap is typical.

## Relationship with Full Ratio

The dirty high ratio should always be lower than the full ratio:

```text
cache_target_dirty_ratio < cache_target_dirty_high_ratio < cache_target_full_ratio
```

Example valid configuration:

```bash
ceph osd pool set cache-pool cache_target_dirty_ratio 0.4
ceph osd pool set cache-pool cache_target_dirty_high_ratio 0.6
ceph osd pool set cache-pool cache_target_full_ratio 0.8
```

## Monitoring Flush Operations

```bash
ceph osd pool stats cache-pool
```

```text
pool cache-pool id 10
  client io 200 MiB/s wr, 50 op/s rd, 5.12k op/s wr
  cache tier io 500 MiB/s flush, 100 op/s evict, 200 op/s promote
```

High flush rates indicate the cache is above `cache_target_dirty_ratio` and working to catch up. If flush rate cannot keep pace with write rate, the dirty ratio climbs and eventually causes write throttling.

## Tuning for Different Workloads

```text
Write Pattern       dirty_ratio   dirty_high_ratio   Notes
Bursty writes       0.3           0.5                Lower threshold, flush early
Steady stream       0.4           0.6                Standard
Write-heavy bulk    0.2           0.4                Aggressive flushing
Low durability req  0.6           0.8                Accept more dirty risk
```

## Risk of High Dirty Ratios

A high dirty ratio means more unflushed data is at risk if all cache pool replicas fail simultaneously. Keep dirty ratios low enough that the flush daemon can maintain parity with incoming write rates under normal conditions.

## Summary

`cache_target_dirty_ratio` and `cache_target_dirty_high_ratio` control when the Ceph flush daemon starts moving dirty objects from the writeback cache to the backing pool. Set the thresholds to provide enough headroom for normal flush operations while preventing dirty data accumulation that could create durability risk. Monitor flush rates to ensure your I/O subsystem can flush dirty objects at the rate they are being written.
