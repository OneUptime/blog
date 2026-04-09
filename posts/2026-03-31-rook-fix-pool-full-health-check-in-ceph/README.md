# How to Fix POOL_FULL Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Pool, Health Check, Storage

Description: Learn how to resolve the POOL_FULL health error in Ceph, which blocks all writes to a pool when it reaches 100% of its configured quota or cluster capacity.

---

## What Is POOL_FULL?

`POOL_FULL` is a critical Ceph health error that occurs when a storage pool has reached its maximum capacity - either the cluster's overall `full_ratio` threshold or a specific pool quota. When a pool is full, Ceph blocks all new writes to that pool to prevent data corruption. Existing data remains intact, but applications cannot write until capacity is freed.

This is different from `POOL_NEAR_FULL`, which is a warning issued before the pool reaches capacity.

## Diagnosing the Issue

Check health detail:

```bash
ceph health detail
```

Output example:

```text
[ERR] POOL_FULL: 1 pool(s) full
    pool 'rbd' is full (used 100.00%)
```

Check overall cluster and per-pool usage:

```bash
ceph df
ceph df detail
```

Inspect the full-ratio thresholds:

```bash
ceph config get mon mon_osd_full_ratio
ceph config get mon mon_osd_backfillfull_ratio
ceph config get mon mon_osd_nearfull_ratio
```

## Fix Options

### Option 1 - Delete Unused Data

The cleanest fix is freeing up space by removing unused snapshots, RBD images, or objects:

```bash
rbd ls <pool-name>
rbd rm <pool-name>/<image-name>
rbd snap purge <pool-name>/<image-name>
```

For CephFS, find and remove large files from within a mounted CephFS volume:

```bash
du -sh /mnt/cephfs/*
find /mnt/cephfs -type f -size +1G
```

### Option 2 - Expand the Cluster

Add new OSD nodes or disks to increase total capacity. In Rook, expand by adding nodes or updating the `CephCluster` CR:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  storage:
    useAllNodes: true
    useAllDevices: true
```

Then restart the operator to discover new devices:

```bash
kubectl -n rook-ceph rollout restart deploy/rook-ceph-operator
```

### Option 3 - Increase the Full Ratio Temporarily

As an emergency measure, you can temporarily raise the full ratio to allow writes while you fix the underlying capacity issue. Use this with extreme caution - the cluster may run out of actual disk space:

```bash
ceph osd set-full-ratio 0.97
ceph osd set-nearfull-ratio 0.90
ceph osd set-backfillfull-ratio 0.95
```

### Option 4 - Remove or Adjust Pool Quotas

If the pool has a configured quota that was set too low:

```bash
ceph osd pool get-quota <pool-name>
ceph osd pool set-quota <pool-name> max_bytes 0
```

Setting `max_bytes 0` removes the quota limit entirely.

## Preventing Pool Full Events

Set alerts before hitting the full ratio. Configure Prometheus alerting on the `ceph_pool_percent_used` metric:

```yaml
- alert: CephPoolNearFull
  expr: ceph_pool_percent_used > 80
  for: 10m
  annotations:
    summary: "Ceph pool {{ $labels.pool_id }} is {{ $value }}% full"
```

## Summary

`POOL_FULL` halts all writes to a Ceph pool when it reaches capacity. Fix it by deleting unused data, expanding the cluster with new OSDs, temporarily raising the full ratio as an emergency measure, or removing pool quotas that are set too low. Always set up proactive monitoring to catch `POOL_NEAR_FULL` before writes are blocked.
