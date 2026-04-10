# How to Understand Cache Tiering Architecture in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CacheTiering, Storage, Architecture

Description: Learn how Ceph cache tiering works architecturally, including the cache pool, backing pool, promotion and eviction flows, and the tradeoffs of this storage design pattern.

---

Ceph cache tiering places a fast storage pool (typically SSD) in front of a slow storage pool (typically HDD) to accelerate hot data access. When data is frequently accessed, it is promoted to the cache tier; when it cools down, it is flushed back to the backing tier. Understanding the architecture helps you decide if cache tiering is appropriate for your workload.

## Core Components

A cache tier setup involves two pools:

- **Cache pool**: Fast storage (NVMe or SSD), holds recently and frequently accessed objects
- **Backing pool**: Slow storage (HDD), holds the authoritative copy of all data

```text
Client
  |
  v
Cache Pool (SSD) <--- hot data promoted from backing
  |  flush/evict
  v
Backing Pool (HDD) <--- all data lives here permanently
```

## Cache Modes

Ceph supports three cache modes:

```text
Mode         Description
writeback    Writes go to cache first, flushed to backing asynchronously
readproxy    Reads served from backing via cache node, no data cached
readonly     Reads cached, writes go directly to backing (read-only client)
```

Writeback is the most commonly used and most complex mode.

## Object Lifecycle in Writeback Mode

```text
1. Client writes object A
   - Object A written to cache pool
   - Client receives ACK immediately

2. Object A is "dirty" (in cache, not yet in backing)
   - Cache tracks dirty ratio

3. Flush occurs (dirty ratio exceeded or age exceeded)
   - Ceph copies Object A to backing pool
   - Object A marked "clean" in cache

4. Object A not accessed for a while
   - Eviction removes Object A from cache pool

5. Client reads Object A later
   - Cache miss: Ceph reads from backing pool
   - If accessed frequently: Object A promoted back to cache (writeback mode)
```

## Promotion and Eviction

**Promotion**: Moving a hot object from backing to cache when it is accessed. Controlled by hit set tracking using a Bloom filter.

**Eviction**: Removing a cold object from cache (clean objects) or flushing then removing dirty objects when cache fills up.

**Flushing**: Writing dirty cache objects back to the backing pool. Required before eviction of dirty objects.

## Hit Set Tracking (Bloom Filter)

Ceph uses a Bloom filter to track which objects have been accessed recently. This avoids promoting objects that are accessed only once (scan-resistant). The hit set is a time-windowed structure:

- Objects must appear in hit sets from multiple time windows before promotion
- This prevents one-time large scans from filling the cache with cold data

## Creating a Basic Cache Tier

```bash
# Create backing pool (HDD)
ceph osd pool create backing-pool 128 128 replicated
ceph osd pool set backing-pool crush_rule hdd-rule

# Create cache pool (SSD)
ceph osd pool create cache-pool 64 64 replicated
ceph osd pool set cache-pool crush_rule ssd-rule

# Overlay the cache on the backing pool
ceph osd tier add backing-pool cache-pool
ceph osd tier cache-mode cache-pool writeback
ceph osd tier set-overlay backing-pool cache-pool
```

## Checking the Tier Configuration

```bash
ceph osd dump | grep -A 5 "pool 'backing-pool'"
```

Expected output:

```text
pool 1 'backing-pool' replicated ...
        tiers [2]
        read_tier 2
        write_tier 2
```

## Ceph Cache Tiering Deprecation Note

Cache tiering has been deprecated in Ceph Reef (18.x) and is expected to be removed in a future release. For new deployments, consider alternatives like application-layer caching (Redis, Memcached) or using NVMe OSDs directly in the cluster with CRUSH rules that place hot pools on fast devices.

## Summary

Ceph cache tiering uses a fast pool overlaid on a slow pool, with objects promoted to the cache when accessed frequently and flushed back when cold. The architecture involves hit set tracking, configurable flush and eviction thresholds, and three cache modes. While architecturally interesting, cache tiering is deprecated in modern Ceph and should only be used in Ceph versions where it is still supported.
