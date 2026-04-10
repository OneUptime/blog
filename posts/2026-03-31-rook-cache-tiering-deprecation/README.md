# How to Understand Cache Tiering Deprecation and Migration Path in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CacheTiering, Storage, Migration

Description: Learn why Ceph cache tiering is deprecated starting with Reef, the known issues that led to deprecation, and the recommended migration paths for existing cache tier deployments.

---

Ceph cache tiering was introduced to transparently accelerate slow HDD storage using fast SSD devices. However, years of production experience revealed fundamental limitations in the design that make it unsuitable for many workloads. Starting with Ceph Reef (18.x), cache tiering is officially deprecated and is expected to be removed in a future release.

## Why Cache Tiering Was Deprecated

The Ceph development community identified several serious issues:

**Complexity and bugs**: The cache tier code path adds significant complexity to RADOS operations. This complexity has been a source of hard-to-fix bugs, including data corruption scenarios and deadlocks under certain failure conditions.

**Performance in practice**: Real-world testing showed that cache tiering often performs worse than expected. The overhead of the hit set tracking, flush daemons, and the additional network hop through the cache layer frequently negates the SSD performance advantage.

**Recovery failures**: During OSD failures, cache tier recovery is more complex and error-prone than regular pool recovery. Unfound objects (dirty cache data on failed OSDs) have caused production data loss incidents.

**Write amplification**: In writeback mode, objects are written to the cache pool and later written again to the backing pool, doubling write amplification and wear on SSDs.

**Limited scan resistance**: Despite hit set bloom filters, large sequential scans (backups, migrations) still pollute the cache with cold data, degrading performance for hot workloads.

## Affected Ceph Versions

```text
Ceph Version   Cache Tiering Status
Octopus 15.x   Supported
Pacific 16.x   Supported (deprecation docs backported in 16.2.14)
Quincy 17.x    Supported (deprecation docs backported in 17.2.7)
Reef 18.x      Deprecated (first official deprecation)
Squid 19.x     Deprecated (tests removed, feature still present)
```

## Migration Path 1: Direct SSD Pool

The simplest migration is to move hot data directly to an SSD-backed pool using CRUSH device classes, eliminating the cache tier entirely:

```bash
# Create CRUSH rule targeting SSD devices
ceph osd crush rule create-replicated ssd-rule default host ssd

# Create SSD pool
ceph osd pool create fast-ssd-pool 64 64 replicated
ceph osd pool set fast-ssd-pool crush_rule ssd-rule
```

Applications that need fast storage use `fast-ssd-pool` directly. Applications that need bulk storage use the HDD pool directly. No cache tier involvement.

## Migration Path 2: Application-Layer Caching

Use Redis, Memcached, or application-specific caching to handle hot data at the application layer:

```yaml
# Example: Redis cache in front of Ceph RBD
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-cache
spec:
  template:
    spec:
      containers:
      - name: redis
        image: redis:7
        resources:
          limits:
            memory: "8Gi"
```

This approach gives applications full control over cache behavior without involving the storage layer.

## Migration Path 3: Mixed Device Class Pools

For clusters with both SSDs and HDDs, use CRUSH device classes to create tiered pools without the cache tier mechanism:

```bash
# HDD pool for bulk data
ceph osd crush rule create-replicated hdd-bulk-rule default host hdd
ceph osd pool create bulk-pool 128 128 replicated
ceph osd pool set bulk-pool crush_rule hdd-bulk-rule

# SSD pool for transactional data
ceph osd crush rule create-replicated ssd-txn-rule default host ssd
ceph osd pool create txn-pool 32 32 replicated
ceph osd pool set txn-pool crush_rule ssd-txn-rule
```

## Removing an Existing Cache Tier Before Reef Upgrade

Before upgrading to Ceph Reef, remove all cache tiers to avoid upgrade complications:

```bash
# For each writeback cache
ceph osd tier cache-mode cache-pool proxy
rados -p cache-pool cache-flush-evict-all
ceph osd tier remove-overlay backing-pool
ceph osd tier remove backing-pool cache-pool
ceph osd pool delete cache-pool cache-pool --yes-i-really-really-mean-it
```

## Summary

Ceph cache tiering is deprecated in Reef due to complexity, production bugs, and real-world performance limitations. The recommended migration paths are: using direct SSD pools via CRUSH device classes, application-layer caching, or separate pools for hot and cold data. Remove existing cache tiers before upgrading to Ceph Reef to avoid deprecated code paths and prepare for eventual feature removal.
