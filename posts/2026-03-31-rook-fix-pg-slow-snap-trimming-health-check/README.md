# How to Fix PG_SLOW_SNAP_TRIMMING Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Snapshot, Health Check, Placement Group

Description: Learn how to resolve PG_SLOW_SNAP_TRIMMING in Ceph, a warning that snapshot deletion is falling behind, causing excess objects to accumulate in PGs.

---

## What Is PG_SLOW_SNAP_TRIMMING?

`PG_SLOW_SNAP_TRIMMING` is a Ceph health warning that fires when snapshot trimming - the process of removing objects associated with deleted snapshots - is running slower than expected. When you delete a snapshot in Ceph, the space is not immediately freed. Instead, objects from the deleted snapshot are queued for trimming (deletion) asynchronously. If trimming falls behind, PGs accumulate stale snapshot objects that consume disk space.

This is commonly seen in RBD or CephFS workloads with frequent snapshot operations, or after bulk snapshot deletions.

## Checking the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] PG_SLOW_SNAP_TRIMMING: 12 pgs are trimming snapshots
    pg 2.0 is slow trimming snapshots (started 600 sec ago)
```

Check trimming status:

```bash
ceph pg dump | grep "snap_trim"
ceph pg 2.0 query | grep -E "snap|trim"
```

## Root Causes

- High snapshot churn (many snapshots created/deleted rapidly)
- Disk I/O bottleneck slowing the trim process
- `notrim` flag is set
- OSD is overloaded with other operations

## Fix Steps

### Step 1 - Check if Snap Trimming is Disabled

```bash
ceph osd dump | grep notrim
```

Remove the flag if set:

```bash
ceph osd unset notrim
```

### Step 2 - Check OSD Load

If OSDs are overloaded with recovery or client I/O, snap trimming is deprioritized:

```bash
ceph tell osd.* dump_ops_in_flight | grep trim
ceph osd perf
```

### Step 3 - Tune Snap Trimming Throughput

Increase the snap trim priority and throughput:

```bash
ceph config set osd osd_snap_trim_sleep 0
ceph config set osd osd_snap_trim_cost 1048576
```

Reduce sleep between trim operations:

```bash
ceph config set osd osd_snap_trim_sleep_hdd 0
ceph config set osd osd_snap_trim_sleep_ssd 0
```

### Step 4 - Increase Snap Trim Concurrency

```bash
ceph config set osd osd_pg_max_concurrent_snap_trims 4
```

### Step 5 - Pause Trimming During Heavy Load

If trimming is competing with recovery:

```bash
ceph osd set notrim
# ... wait for recovery to complete ...
ceph osd unset notrim
```

## Monitoring Trim Progress

```bash
watch "ceph pg stat | grep trim"
ceph pg dump | grep "snap" | wc -l
```

## Preventing Slow Snap Trimming

Avoid creating and deleting large numbers of snapshots rapidly. For RBD, use a snapshot management schedule:

```bash
rbd snap ls <pool>/<image>
```

Clean up old snapshots regularly:

```bash
rbd snap purge <pool>/<image>
```

## Summary

`PG_SLOW_SNAP_TRIMMING` warns that deleted snapshot cleanup is lagging, accumulating stale objects in PGs. Fix it by checking the `notrim` flag, increasing snap trim concurrency and reducing trim sleep intervals, and ensuring OSD I/O is not saturated with competing operations. Regular snapshot pruning and avoiding rapid snapshot churn prevents this warning from appearing.
