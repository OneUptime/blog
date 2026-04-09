# How to Fix CACHE_POOL_NO_HIT_SET Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Cache, Pool, Tiering

Description: Learn how to resolve the CACHE_POOL_NO_HIT_SET warning in Ceph when a cache tier pool is missing a hit set configuration needed to track object access patterns.

---

## Understanding CACHE_POOL_NO_HIT_SET

Cache tiering in Ceph uses a "hit set" to track which objects in the cache pool have been accessed recently. The hit set is essentially a bloom filter that records object reads and writes. When a cache pool is configured without a valid hit set, Ceph cannot determine which objects to promote from the backing pool or evict from the cache pool, and raises `CACHE_POOL_NO_HIT_SET`.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN cache pools are missing hit_sets
[WRN] CACHE_POOL_NO_HIT_SET: pool 'cache-pool' has no hit_set_count
```

## Understanding Cache Tiering

Cache tiering uses two pools:
- **Cache pool**: fast storage (SSD), holds hot data
- **Backing pool**: slow storage (HDD), holds all data

A hit set tracks access patterns so Ceph can manage promotion and eviction intelligently.

## Checking Cache Pool Configuration

Inspect the current pool settings:

```bash
ceph osd pool get cache-pool all
```

Look for these hit set related parameters:

```text
hit_set_count: 0
hit_set_period: 0
hit_set_type: none
```

If `hit_set_count` is 0 or `hit_set_type` is `none`, the hit set is not configured.

## Configuring the Hit Set

Set up a proper hit set for the cache pool:

```bash
# Configure hit set parameters
ceph osd pool set cache-pool hit_set_type bloom
ceph osd pool set cache-pool hit_set_count 12
ceph osd pool set cache-pool hit_set_period 14400

# Set the target_max_bytes to limit cache size
ceph osd pool set cache-pool target_max_bytes 1073741824000  # 1TB
```

Verify the settings took effect:

```bash
ceph osd pool get cache-pool all | grep hit_set
```

## Understanding Hit Set Parameters

- `hit_set_type`: Bloom filter type. Use `bloom` for most cases.
- `hit_set_count`: Number of hit sets to maintain (sliding window). Use 4-12.
- `hit_set_period`: Seconds each hit set is active. `14400` = 4 hours.

With `count=12` and `period=14400`, Ceph tracks 48 hours of access history.

## Complete Cache Tier Configuration Example

Full working cache tier setup for reference:

```bash
# Associate cache pool with backing pool
ceph osd tier add data-pool cache-pool
ceph osd tier cache-mode cache-pool writeback

# Configure hit sets
ceph osd pool set cache-pool hit_set_type bloom
ceph osd pool set cache-pool hit_set_count 12
ceph osd pool set cache-pool hit_set_period 14400

# Configure cache capacity
ceph osd pool set cache-pool target_max_bytes 107374182400  # 100GB
ceph osd pool set cache-pool target_max_objects 1000000

# Configure eviction ratios
ceph osd pool set cache-pool cache_target_dirty_ratio 0.4
ceph osd pool set cache-pool cache_target_full_ratio 0.8
ceph osd pool set cache-pool cache_min_flush_age 600
ceph osd pool set cache-pool cache_min_evict_age 1800

# Set the overlay so reads/writes go through cache
ceph osd tier set-overlay data-pool cache-pool
```

## Verifying the Fix

After configuring the hit set:

```bash
ceph health detail
ceph osd pool stats cache-pool
```

Confirm the hit set parameters are applied:

```bash
ceph osd pool get cache-pool hit_set_type
ceph osd pool get cache-pool hit_set_count
ceph osd pool get cache-pool hit_set_period
```

## Note on Cache Tiering Deprecation

Cache tiering has been deprecated as of the Ceph Reef release and has lacked an active maintainer for some time. The Ceph community advises against new cache tiering deployments. Consider alternatives such as placing pools directly on faster device classes using CRUSH rules, or using OS-level caching like dm-cache or bcache.

## Summary

`CACHE_POOL_NO_HIT_SET` fires when a cache tier pool lacks a configured hit set, preventing Ceph from tracking object access for promotion and eviction decisions. Fix by setting `hit_set_type bloom`, `hit_set_count`, and `hit_set_period` on the cache pool. Combine with `target_max_bytes` and eviction ratio settings for a complete cache tier configuration.
