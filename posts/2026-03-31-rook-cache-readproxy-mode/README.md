# How to Set Up Readproxy Cache Mode in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CacheTiering, Storage, Performance

Description: Learn how to configure readproxy cache mode in Ceph, where the cache tier proxies read requests to the backing pool without caching data locally, and writes bypass the cache entirely.

---

**Note:** Cache tiering has been deprecated since the Ceph Reef release. The upstream Ceph community strongly advises against deploying new cache tiers. This guide is provided for operators managing existing cache tier configurations.

Readproxy is a lightweight cache tier mode in Ceph. In this mode, read requests for objects not already in the cache are proxied to the backing pool, while objects already present in the cache tier continue to be served from it. Write operations may still promote objects into the cache tier. This mode can be used as a transitional step when removing a writeback cache tier, though `proxy` mode is generally recommended for fully draining a cache since it forwards both reads and writes to the backing pool.

## How Readproxy Works

```text
Client Read Request
  |
  v
Cache Pool (readproxy mode)
  |  - No read promotion
  |  - Proxies read misses to backing pool
  |  - Existing cached objects still served
  v
Backing Pool (HDD)
  |
  v
Data returned to client through cache pool
```

In readproxy mode:
- Read requests for objects not in the cache are proxied to the backing pool
- Objects already present in the cache tier are still served from it
- Write operations may still promote objects to the cache tier
- Dirty objects from a previous writeback phase are still flushed if present

## Primary Use Case: Writeback Tier Removal

When removing a writeback cache tier, `proxy` mode is recommended because it forwards both reads and writes to the backing pool, preventing new objects from being promoted to the cache:

1. Change from `writeback` to `proxy` - all I/O forwards to the backing pool
2. Flush remaining dirty objects: `rados -p cache-pool cache-flush-evict-all`
3. Remove the overlay: `ceph osd tier remove-overlay backing-pool`
4. Remove the tier: `ceph osd tier remove backing-pool cache-pool`

`readproxy` can also be used as a transitional mode, but since writes may still promote objects, `proxy` is generally preferred for a clean drain. Both modes prevent data loss during cache removal.

## Setting Up Readproxy Mode

First, set up pools and the tier relationship:

```bash
# Backing pool
ceph osd pool create backing-pool 128 128 replicated

# Cache pool (small, no data stored)
ceph osd pool create cache-pool 32 32 replicated

# Add cache tier
ceph osd tier add backing-pool cache-pool

# Set readproxy mode
ceph osd tier cache-mode cache-pool readproxy

# Set overlay
ceph osd tier set-overlay backing-pool cache-pool
```

## Verifying Readproxy Mode

```bash
ceph osd dump | grep -A 3 "pool 'cache-pool'"
```

```text
pool 2 'cache-pool' replicated ...
        cache_mode: readproxy
        tier_of 1
```

## Transitioning from Writeback to Readproxy

```bash
# Change an existing writeback cache to readproxy
ceph osd tier cache-mode cache-pool readproxy

# Or, for a cleaner drain, use proxy mode instead
ceph osd tier cache-mode cache-pool proxy
```

After this change, check for remaining dirty objects:

```bash
rados -p cache-pool ls | head -20
# Should show decreasing objects as they are flushed
```

Monitor flush progress:

```bash
watch "ceph df | grep cache-pool"
```

## Monitoring During Readproxy Phase

The primary metric to watch is the flush of remaining dirty objects:

```bash
ceph osd pool stats cache-pool
```

```text
cache tier io 500 MiB/s flush, 0 MiB/s promote
```

Promotion rate drops to 0 in readproxy mode. Flush rate continues until all dirty objects are gone.

## When to Use Readproxy in Production

Beyond the removal use case, readproxy can be useful when:

- You want the cache pool to act as a network proximity layer (e.g., cache pool on a different rack) without the complexity of writeback
- You are transitioning a cluster to remove cache tiering in favor of application-layer caching
- You need to disable write caching temporarily for maintenance

## Summary

Readproxy cache mode proxies read requests for objects not already in the cache to the backing pool, while objects already in the cache are still served from it. Write operations may still promote objects to the cache tier. It can be used as a transitional step when removing a writeback cache tier, though `proxy` mode is generally preferred for fully draining a cache since it forwards both reads and writes to the backing pool. Note that cache tiering is deprecated since the Reef release and should not be used for new deployments.
