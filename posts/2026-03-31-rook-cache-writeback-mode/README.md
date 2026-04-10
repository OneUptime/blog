# How to Set Up Writeback Cache Mode in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CacheTiering, Storage, Performance

Description: Learn how to configure writeback cache mode in Ceph, where writes land on a fast SSD pool first and are asynchronously flushed to the backing HDD pool for improved write latency.

---

Writeback cache mode is the most capable cache tier mode in Ceph. In this mode, write operations are acknowledged as soon as data lands on the cache pool (fast SSD), and data is asynchronously flushed to the backing pool (HDD). This reduces write latency significantly for workloads that write frequently to the same objects.

## Prerequisites

- Separate CRUSH rules for SSD and HDD device classes
- BlueStore on all OSDs (recommended)
- Sufficient SSD capacity for your hot working set
- Ceph Octopus or earlier (cache tiering deprecated in Reef)

## Step 1: Create CRUSH Rules for Each Device Class

```bash
# Create CRUSH rule for HDD-only placement
ceph osd crush rule create-replicated hdd-rule default host hdd

# Create CRUSH rule for SSD-only placement
ceph osd crush rule create-replicated ssd-rule default host ssd
```

## Step 2: Create Backing and Cache Pools

```bash
# Backing pool on HDD
ceph osd pool create backing-hdd 128 128 replicated
ceph osd pool set backing-hdd crush_rule hdd-rule

# Cache pool on SSD
ceph osd pool create cache-ssd 64 64 replicated
ceph osd pool set cache-ssd crush_rule ssd-rule
```

## Step 3: Configure the Writeback Tier

```bash
# Associate cache pool as a tier of the backing pool
ceph osd tier add backing-hdd cache-ssd

# Set writeback mode on the cache pool
ceph osd tier cache-mode cache-ssd writeback

# Set the overlay so clients automatically use the cache pool
ceph osd tier set-overlay backing-hdd cache-ssd
```

## Step 4: Configure Cache Behavior

```bash
# Set target cache size (80% of the cache pool)
ceph osd pool set cache-ssd target_max_bytes 107374182400  # 100 GiB

# Set dirty flush threshold (40% dirty triggers flush)
ceph osd pool set cache-ssd cache_target_dirty_ratio 0.4

# Set eviction threshold (80% full triggers eviction)
ceph osd pool set cache-ssd cache_target_full_ratio 0.8

# Configure hit set for promotion decisions
ceph osd pool set cache-ssd hit_set_type bloom
ceph osd pool set cache-ssd hit_set_count 12
ceph osd pool set cache-ssd hit_set_period 14400  # 4 hours

# Minimum hit count before promotion
ceph osd pool set cache-ssd min_read_recency_for_promote 2
```

## Step 5: Verify Configuration

```bash
ceph osd dump | grep -E "cache_mode|cache_target|tier"
```

Output:

```text
cache_mode: writeback
cache_target_dirty_ratio 0.4
cache_target_full_ratio 0.8
tier_of 1
```

## Monitoring Cache Performance

```bash
# Check cache hit/miss and flush rates
ceph osd pool stats cache-ssd
```

```text
client io 1000 MiB/s wr, 500 MiB/s rd
cache tier io 800 MiB/s flush, 50 MiB/s evict, 200 MiB/s promote
```

## Important Warnings

Writeback mode carries risk: if the cache pool is lost (e.g., all SSD nodes fail simultaneously), dirty objects that have not been flushed to the backing pool are lost permanently. Mitigations:

- Use replicated cache pools (size 2 or 3) - never use single-replica cache
- Monitor dirty ratio and flush promptly when high
- Consider writeback acceptable only for non-critical or reproducible data

## Summary

Writeback cache mode routes writes to the SSD cache pool first and flushes to the HDD backing pool asynchronously. Configure dirty flush thresholds, eviction ratios, hit set parameters, and target sizes to tune cache behavior. Always use replicated cache pools to protect dirty data, and note that cache tiering is deprecated in Ceph Reef and later.
