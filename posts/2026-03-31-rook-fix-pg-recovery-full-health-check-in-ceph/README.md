# How to Fix PG_RECOVERY_FULL Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Placement Group, Health Check, Recovery

Description: Learn how to fix PG_RECOVERY_FULL in Ceph, which halts PG recovery operations because the cluster is too full to safely complete data replication.

---

## What Is PG_RECOVERY_FULL?

`PG_RECOVERY_FULL` is a Ceph health error that occurs when the cluster has reached the `backfillfull_ratio` threshold during PG recovery operations. Ceph stops recovery processes to prevent OSDs from becoming completely full, which would lead to data loss or unavailability.

This typically happens when a cluster was already near full capacity and then experienced OSD failures, triggering recovery that would push OSDs over their capacity limits.

## Checking Cluster Status

```bash
ceph health detail
ceph df
```

Example output:

```text
[ERR] PG_RECOVERY_FULL: Full OSDs blocking recovery: 5 pg(s) recovery_toofull
    pg 1.a is recovery_toofull for 300s
```

Check the full ratio thresholds:

```bash
ceph config get mon mon_osd_full_ratio
ceph config get mon mon_osd_backfillfull_ratio
ceph config get mon mon_osd_nearfull_ratio
```

Check per-OSD utilization:

```bash
ceph osd df
```

## Fix Strategy

The core problem is insufficient free space. You need to free capacity before recovery can proceed.

### Step 1 - Identify Which OSDs Are Full

```bash
ceph osd df | sort -k11 -n -r | head -10
```

### Step 2 - Delete Unused Data

Remove old snapshots, RBD images, or stale objects:

```bash
rbd ls <pool-name>
rbd snap ls <pool-name>/<image>
rbd snap purge <pool-name>/<image>
```

For object storage pools:

```bash
rados -p <pool-name> ls | wc -l
```

### Step 3 - Temporarily Raise the Full Ratio

As an emergency measure while you work on capacity:

```bash
ceph osd set-full-ratio 0.97
ceph osd set-backfillfull-ratio 0.92
ceph osd set-nearfull-ratio 0.88
```

Verify the ratios were applied:

```bash
ceph osd dump | grep -E "full|backfill|nearfull"
```

### Step 4 - Add New OSD Capacity

Add new nodes or disks. In Rook, update the cluster CR and restart the operator:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  storage:
    useAllNodes: true
    useAllDevices: true
```

```bash
kubectl -n rook-ceph rollout restart deploy/rook-ceph-operator
```

### Step 5 - Ensure Recovery Flags Are Not Set

Recovery resumes automatically once OSDs drop below the full threshold. However, if someone previously set `norecover` or `nobackfill` flags manually, you need to unset them:

```bash
ceph osd unset norecover
ceph osd unset nobackfill
```

## Monitoring Recovery Progress

```bash
watch ceph -s
ceph pg stat
```

Wait for all PGs to return to `active+clean`.

## Summary

`PG_RECOVERY_FULL` blocks data recovery because the cluster lacks the free space to safely replicate data. Fix it by freeing up space (deleting old data, snapshots), temporarily raising the full ratio thresholds, and adding new OSD capacity. Once sufficient space is available, recovery resumes automatically and the health alert clears.
