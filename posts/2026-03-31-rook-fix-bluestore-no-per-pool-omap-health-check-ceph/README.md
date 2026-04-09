# How to Fix BLUESTORE_NO_PER_POOL_OMAP Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, BlueStore, OMAP, Pool

Description: Learn how to resolve the BLUESTORE_NO_PER_POOL_OMAP health warning in Ceph by migrating OSD OMAP data to per-pool namespaces for better isolation and performance.

---

## Understanding BLUESTORE_NO_PER_POOL_OMAP

OMAP (Object Map) is a key-value store attached to RADOS objects, used heavily by RGW (bucket indexes), CephFS (directory entries), and RBD (object headers). Prior to Ceph Octopus (15.x), all OMAP data was stored in a single RocksDB column family, making it impossible to isolate OMAP by pool for garbage collection and performance.

`BLUESTORE_NO_PER_POOL_OMAP` fires when one or more OSDs are still using the old global OMAP storage instead of the per-pool OMAP format.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN OSDs are not using per-pool omap
[WRN] BLUESTORE_NO_PER_POOL_OMAP: 8 OSDs are not using per-pool omap
    osd.0 through osd.7 have not been converted
```

## Checking OMAP Format

Inspect OSD metadata for the current OMAP status:

```bash
ceph osd metadata 0 | python3 -m json.tool | grep omap
```

Check all OSDs:

```bash
ceph osd metadata | python3 -m json.tool | grep -A1 '"id"' | grep -E '"id"|omap'
```

## Triggering OMAP Migration

Per-pool OMAP migration happens automatically when Ceph processes deep scrubs on OSDs running Octopus or later. The fastest way to trigger migration is to run a deep scrub:

```bash
# Deep scrub all PGs on affected OSDs
ceph osd deep-scrub 0
ceph osd deep-scrub 1

# Or queue deep scrub for all OSDs
ceph osd deep-scrub all
```

Monitor scrub progress:

```bash
ceph pg stat | grep scrubbing
watch "ceph status | grep scrub"
```

## Waiting for Migration to Complete

Migration happens PG by PG as deep scrubs complete. Check progress:

```bash
ceph health detail | grep BLUESTORE_NO_PER_POOL_OMAP
```

The number of affected OSDs should decrease as scrubs complete. Full migration can take hours to days on large clusters.

## Accelerating Deep Scrubs

Speed up scrubbing by increasing parallelism:

```bash
# Allow more concurrent scrubs
ceph config set osd osd_max_scrubs 3

# Reduce minimum scrub interval
ceph config set osd osd_scrub_min_interval 3600
```

Restore defaults after migration:

```bash
ceph config rm osd osd_max_scrubs
ceph config rm osd osd_scrub_min_interval
```

## Rook Deployments

In Rook, trigger deep scrubs via the toolbox:

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- ceph osd deep-scrub all
```

Monitor progress:

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- watch ceph health detail
```

## Verifying Completion

After all OSDs migrate:

```bash
ceph health detail | grep BLUESTORE_NO_PER_POOL_OMAP
```

This warning should disappear once all OSDs have been deep-scrubbed and migrated.

## Benefits After Migration

Once migrated to per-pool OMAP:
- OMAP garbage collection is pool-aware
- Deleting a pool also cleans up its OMAP data efficiently
- RocksDB compaction is more targeted and faster
- Better isolation between RGW bucket indexes and other OMAP users

## Summary

`BLUESTORE_NO_PER_POOL_OMAP` warns that OSDs are using global OMAP storage instead of the newer per-pool namespace format. Migration happens automatically during deep scrubs - trigger with `ceph osd deep-scrub all` and wait for all PGs to complete. On large clusters, temporarily increase scrub parallelism to accelerate migration. Verify completion by confirming the health check clears.
