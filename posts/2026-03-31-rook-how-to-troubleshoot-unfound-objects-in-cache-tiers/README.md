# How to Troubleshoot Unfound Objects in Cache Tiers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Cache Tiering, Troubleshooting, Data Recovery

Description: Diagnose and resolve unfound objects in Ceph cache tiers, including identifying stuck flushes, peering issues, and recovering data from degraded cache pools.

---

## What Are Unfound Objects

In Ceph, an "unfound" object is one that a PG knows should exist (it has a log entry for the object) but cannot locate on any available OSD. In cache tiers, this most commonly occurs when:

- The cache OSD containing an object fails before flushing the object to the backing pool
- PG peering fails to find all required replicas
- A cache eviction bug leaves an object reference without actual data

```bash
# Detect unfound objects
ceph health detail | grep unfound
ceph pg dump_stuck
```

## Step 1 - Identify Affected PGs

```bash
# List PGs with unfound objects
ceph pg dump | grep unfound

# List unfound objects for a specific PG
ceph pg <pgid> list_missing

# Count unfound objects
ceph pg <pgid> list_missing | jq '.num_unfound'
```

Example output:

```text
pg 1.4a:
  num_unfound: 2
  unfound_objects:
    - object: 1:abc123:rbd_data.pool1:1234
    - object: 1:def456:rbd_data.pool1:5678
```

## Step 2 - Check Cache Flush Status

Unfound objects in cache tiers are often stuck flushes. Check if the backing pool is healthy and the flush path is intact:

```bash
# Verify cache tier overlay is set
ceph osd tier get-overlay <backing-pool>

# Check cache pool health
ceph osd pool stats <cache-pool>

# Verify OSDs for the affected PG are up
ceph pg <pgid> query | jq '.acting'
```

## Step 3 - Force Object Recovery

If the cache tier still has the object data but the PG is confused about its location, force a recovery:

```bash
# Mark the PG for recovery
ceph pg repair <pgid>

# Force unfound objects to be marked as lost (if data is truly gone)
# WARNING: Use only as last resort - this permanently marks objects as deleted
ceph pg <pgid> mark_unfound_lost revert
```

The `revert` option deletes the object if there is no snapshot to revert to. If the object has a previous snapshot version, it reverts to that snapshot.

## Step 4 - Flush Cache Tier Manually

If objects are stuck in the cache and not flushing:

```bash
# List objects in the cache pool
rados -p <cache-pool> ls | head -20

# Manually flush a specific object
rados -p <cache-pool> cache-flush <object-name>

# Flush the entire cache tier
rados -p <cache-pool> cache-flush-evict-all
```

## Step 5 - Investigate PG Log

The PG log shows the history of object operations and can reveal why an object is unfound:

```bash
# Search PG query output for a specific object (may be long)
ceph pg <pgid> query 2>/dev/null | grep <object-name>

# Query PG status
ceph pg <pgid> query | jq '.pg_log.log[-10:]'
```

## Step 6 - Check for OSD Failures During Flush

If the cache OSD died mid-flush, the backing pool may have a partial write:

```bash
# Flush the OSD daemon log to disk for inspection (if recently recovered)
ceph daemon osd.X log flush

# Look for incomplete writes in OSD logs
journalctl -u ceph-osd@X --since "1 hour ago" | grep -i error
```

## Recovering from Lost Cache Data

When cache data is permanently lost (OSD failure with no replacement):

```bash
# First, check if the backing pool has the object
rados -p <backing-pool> stat <object-name>

# If present in backing pool but not in cache, force cache to re-read it
# Remove the cache PG's reference to the unfound object
ceph pg <pgid> mark_unfound_lost delete

# The object will now be served from the backing pool
```

## Preventing Cache Tier Unfound Objects

Best practices to minimize unfound objects:

```bash
# Set min_size appropriately for cache pool
ceph osd pool set fast-cache min_size 2  # Require 2 replicas

# Enable flush on cache pool full
ceph osd pool set fast-cache cache_target_full_ratio 0.7  # Flush before full

# Set reasonable dirty flush age
ceph osd pool set fast-cache cache_min_flush_age 300  # Flush after 5 min
```

## Removing the Cache Tier Safely

If unfound objects are blocking cache tier removal:

```bash
# Switch to forward mode first
ceph osd tier cache-mode <cache-pool> forward

# Watch cluster events until flushes complete
ceph -w

# Force flush any remaining objects
rados -p <cache-pool> cache-flush-evict-all

# Remove overlay
ceph osd tier remove-overlay <backing-pool>

# Remove tier
ceph osd tier remove <backing-pool> <cache-pool>
```

## Summary

Unfound objects in Ceph cache tiers most commonly occur when cache OSDs fail before flushing dirty objects to the backing pool. Diagnosis involves identifying affected PGs with `ceph pg dump | grep unfound`, checking cache flush status, and verifying OSD health. Recovery options include forcing cache flushes, using `rados cache-flush-evict-all`, or as a last resort using `ceph pg mark_unfound_lost revert` to permanently delete unrecoverable objects. Prevention relies on adequate cache pool replication and aggressive flush settings.
