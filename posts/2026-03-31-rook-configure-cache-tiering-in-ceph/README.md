# How to Configure Cache Tiering in Ceph (Deprecated in Reef)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Cache, Pool, Performance

Description: Understand how Ceph cache tiering works, how to configure it on older clusters, and why it is deprecated in favor of BlueStore in modern Ceph.

---

## What is Cache Tiering

Cache tiering in Ceph allows you to create a two-layer storage architecture where a fast SSD pool sits in front of a slower HDD pool. Hot data is promoted to the fast tier automatically, and cold data is flushed back to the base tier.

**Important:** Cache tiering is deprecated as of Ceph Reef (v18) and may be removed in future releases without much notice. For modern clusters, BlueStore's built-in cache and RocksDB WAL placement on NVMe provide better performance without the complexity of tiering.

## How Cache Tiering Worked

The architecture involved:
- A **base pool** (slow, HDD) for durable storage
- A **cache pool** (fast, SSD) for hot data
- A **cache tier** relationship linking them

When a client wrote to the base pool, data landed in the cache pool first, then was flushed to the base pool based on hit rate and size thresholds.

## Legacy Cache Tier Configuration

For clusters still running pre-Reef Ceph, here is the configuration procedure:

```bash
# Create the cache pool on SSDs
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create cache-pool 64 64 replicated ssd-rule

# Set up the tier relationship
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tier add base-pool cache-pool

# Set cache mode to writeback
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tier cache-mode cache-pool writeback

# Set the cache as the overlay for the base pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tier set-overlay base-pool cache-pool
```

## Cache Pool Tuning

```bash
# Maximum size of cache pool before eviction starts
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set cache-pool target_max_bytes 107374182400

# Start flushing dirty objects when 80% of cache contains modified data
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set cache-pool cache_target_dirty_ratio 0.8

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set cache-pool cache_target_full_ratio 0.9

# Number of hit set periods to retain for tracking promotion
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set cache-pool hit_set_count 12

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set cache-pool hit_set_period 14400
```

## Removing Cache Tiering

To remove a cache tier safely:

```bash
# Change mode to proxy (stop accepting new writes to cache)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tier cache-mode cache-pool proxy

# Flush all dirty objects to base pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados -p cache-pool cache-flush-evict-all

# Remove overlay and tier relationship
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tier remove-overlay base-pool

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tier remove base-pool cache-pool
```

## Modern Alternative: BlueStore Cache Tuning

Instead of cache tiering, configure BlueStore's cache on modern clusters:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd bluestore_cache_size_ssd 3221225472
```

Place BlueStore's RocksDB WAL and DB on NVMe for similar fast-path benefits without the tiering complexity.

## Summary

Ceph cache tiering provided a way to use SSDs as a front cache for HDD pools. It is deprecated in Reef and should not be used in new deployments. Modern Ceph achieves the same goals through BlueStore's internal caching and device class placement. If you are still running cache tiers, plan a migration by flushing and removing them before upgrading to Reef or later.
