# How to Troubleshoot Unfound Objects in Cache Tiers in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CacheTiering, Troubleshooting, Storage

Description: Learn how to identify and resolve unfound object errors in Ceph cache tiers, where objects exist in the cache but cannot be located in the backing pool during flush operations.

---

Unfound objects in Ceph cache tiers occur when the cluster knows an object should exist (based on the PG log) but cannot locate all the necessary shards or copies to serve or flush it. This typically happens after OSD failures during cache tier operations. Resolving unfound objects correctly is critical to avoid data loss.

## What Are Unfound Objects?

An object is "unfound" when:
- Ceph's PG log indicates the object was written
- But not enough OSD shards are available to reconstruct the object

In cache tier context, this most commonly happens when:
- Cache pool OSDs fail before dirty objects were flushed to the backing pool
- The cache pool has only a single replica and the OSD failed

## Detecting Unfound Objects

```bash
ceph health detail
```

Look for:

```text
HEALTH_ERR 3 pg degraded; 2 pg stuck unclean; 1 pg has unfound objects
```

Identify which PGs have unfound objects:

```bash
ceph pg dump_stuck unclean
```

List the unfound objects in a specific PG:

```bash
ceph pg 2.4 list_unfound
```

Output:

```json
{
  "offset": {"oid": "", "key": "", "snapid": 0, "hash": 0, "max": 0},
  "num_missing": 3,
  "num_unfound": 3,
  "objects": [
    {"oid": "cache-object-001", "key": "", "hash": 1234, "max": 0, "pool": 2, "namespace": ""}
  ],
  "more": false
}
```

## Option 1: Recover from Another OSD

If the unfound objects exist on an OSD that is down but potentially recoverable, bring that OSD back online:

```bash
# Check if the OSD can be started
ceph osd out 3
ceph osd in 3
systemctl start ceph-osd@3
```

Monitor recovery:

```bash
ceph -w
```

If recovery succeeds, unfound objects are resolved automatically.

## Option 2: Mark Objects as Lost (Last Resort)

If the OSD containing the only copies is permanently lost and the objects cannot be recovered, mark them as lost:

```bash
# This permanently discards the unfound objects - irreversible!
ceph pg 2.4 mark_unfound_lost revert
```

The `revert` option either:
- Reverts to a prior version of the object if one exists in the backing pool
- Marks the object as deleted if no prior version exists

For cache tier dirty objects with no backing pool copy, this means permanent data loss.

## Option 3: Delete Lost Objects

```bash
# Permanently delete unfound objects
ceph pg 2.4 mark_unfound_lost delete
```

Use this when the objects are confirmed to be duplicates or unimportant cache data.

## Prevention: Use Replicated Cache Pools

The most effective prevention for cache tier unfound objects is using a replicated cache pool (size >= 2):

```bash
ceph osd pool create cache-pool 64 64 replicated
ceph osd pool set cache-pool size 3
ceph osd pool set cache-pool min_size 2
```

A single-replica cache pool (size=1) should never be used in production - a single OSD failure creates unrecoverable unfound objects.

## Checking OSD Status After Cache Failure

```bash
ceph osd tree | grep down
```

```text
-4    hdd host node2
  3  osd.3  down  0.9 TiB  # OSD with cache data
```

## Flush Before Failure Windows

Monitor dirty object counts and proactively flush before planned OSD maintenance:

```bash
# Force flush all dirty objects before OSD maintenance
rados -p cache-pool cache-flush-evict-all

# Wait for dirty count to reach 0
watch "ceph df | grep cache-pool"
```

## Summary

Unfound objects in cache tiers occur when dirty cache objects cannot be located, typically after OSD failures. Prevention is key - always use replicated cache pools (size >= 2) and proactively flush dirty objects before OSD maintenance. When unfound objects do occur, attempt OSD recovery first. Only use `mark_unfound_lost` as a last resort, understanding it may permanently delete data that was written to the cache but not yet flushed.
