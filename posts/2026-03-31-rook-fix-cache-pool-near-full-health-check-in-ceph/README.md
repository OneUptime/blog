# How to Fix CACHE_POOL_NEAR_FULL Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Cache Pool, Health Check, Tiering

Description: Learn how to resolve CACHE_POOL_NEAR_FULL in Ceph, a warning that the cache tier pool is approaching its capacity limit and flush/evict may not keep up.

---

## What Is CACHE_POOL_NEAR_FULL?

`CACHE_POOL_NEAR_FULL` is a Ceph health warning indicating that a cache tier pool is nearing its configured capacity. Ceph's cache tiering feature uses a fast pool (e.g., SSDs) as a cache in front of a slower base pool (e.g., HDDs). When the cache pool fills up, the cache agent needs to flush dirty objects to the base pool and evict clean objects to make room.

If the cache pool fills faster than the agent can flush/evict, writes to the cache tier stall, degrading performance for all clients using that pool.

## Checking Cache Pool Status

```bash
ceph health detail
ceph df
```

Example output:

```text
[WRN] CACHE_POOL_NEAR_FULL: Cache tier 'hot-storage' is 85% full
```

Inspect the cache pool's tier configuration:

```bash
ceph osd pool get hot-storage cache_mode
ceph osd dump | grep cache
```

Check eviction and flush stats:

```bash
ceph osd pool stats hot-storage
```

## Fix Options

### Option 1 - Increase Flush and Evict Aggressiveness

Tune the cache agent to flush/evict more aggressively:

```bash
ceph osd pool set hot-storage cache_target_dirty_ratio 0.2
ceph osd pool set hot-storage cache_target_dirty_high_ratio 0.3
ceph osd pool set hot-storage cache_target_full_ratio 0.7
ceph osd pool set hot-storage cache_min_flush_age 300
ceph osd pool set hot-storage cache_min_evict_age 300
```

Lower values mean objects are flushed/evicted sooner and more aggressively.

### Option 2 - Increase Cache Pool Capacity

Add more OSDs to the cache pool and increase the cache target size:

```bash
ceph osd pool set hot-storage target_max_bytes 536870912000
```

Or set the target based on object count:

```bash
ceph osd pool set hot-storage target_max_objects 1000000
```

### Option 3 - Increase Cache Pool Hit Set Parameters

Adjust how aggressively the cache tracks object access patterns:

```bash
ceph osd pool set hot-storage hit_set_type bloom
ceph osd pool set hot-storage hit_set_count 4
ceph osd pool set hot-storage hit_set_period 3600
ceph osd pool set hot-storage min_read_recency_for_promote 1
ceph osd pool set hot-storage min_write_recency_for_promote 1
```

### Option 4 - Force Flush Cache

Manually flush all dirty objects from the cache to the base pool:

```bash
rados -p hot-storage cache-flush-evict-all
```

Or flush specific objects:

```bash
rados -p hot-storage cache-flush <object-name>
```

### Option 5 - Reconsider Cache Tiering

Cache tiering adds significant complexity and has known issues with RBD workloads. If you're using it for RBD, consider switching to a dedicated fast pool with a CRUSH rule that targets SSDs instead:

```bash
ceph osd crush rule create-replicated replicated_ssd default host ssd
ceph osd pool set <pool-name> crush_rule replicated_ssd
```

## Summary

`CACHE_POOL_NEAR_FULL` warns that your Ceph cache tier pool is filling up faster than it can flush to the base tier. Fix it by tuning flush/evict ratios to be more aggressive, expanding the cache pool capacity, or forcing a manual cache flush. For production clusters, consider whether cache tiering is the right approach versus directly targeting fast devices with CRUSH rules.
