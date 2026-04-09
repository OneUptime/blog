# How to Fix MON_DISK_LOW Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Monitor, Disk, Storage

Description: Learn how to resolve the MON_DISK_LOW health warning in Ceph by freeing disk space or expanding monitor storage to maintain cluster stability.

---

## Understanding MON_DISK_LOW

Ceph monitors store the cluster map and history of all cluster state changes on local disk. The `MON_DISK_LOW` health check fires when the available space on the monitor's data partition drops below 30% (by default). This is a warning that action is needed before the more severe `MON_DISK_CRIT` threshold is reached.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN low disk space on mons
[WRN] MON_DISK_LOW: mon.b has low disk space
    mon.b disk space is 22% of 50GB, below 30% threshold
```

## Identifying Disk Usage on Monitor Nodes

Check how much space the monitor data directory is consuming:

```bash
du -sh /var/lib/ceph/mon/ceph-*/
df -h /var/lib/ceph/mon/
```

The monitor data directory grows over time as the cluster map history accumulates. Ceph compacts this data periodically, but under high churn it can grow quickly.

## Compacting the Monitor Store

Ceph can compact the RocksDB key-value store used by monitors. This often recovers significant space:

```bash
ceph tell mon.* compact
```

Alternatively, trigger compaction on a specific monitor:

```bash
ceph tell mon.b compact
```

After compaction, check disk usage again:

```bash
du -sh /var/lib/ceph/mon/ceph-b/
```

## Trimming Monitor History

Old map epochs accumulate over time. Reduce the number of OSD map epochs retained by monitors:

```bash
ceph config set mon mon_min_osdmap_epochs 200
```

Make Paxos state trimming more aggressive to reclaim space from all monitor services:

```bash
ceph config set mon paxos_trim_min 100
```

After changing these settings, trimming occurs automatically. Run compaction again to reclaim freed space:

```bash
ceph tell mon.* compact
```

## Expanding Monitor Disk in Rook

In Rook-managed deployments, monitor data is stored on PersistentVolumeClaims. Expand the PVC:

```bash
kubectl -n rook-ceph get pvc | grep mon
```

Edit the PVC to request more storage:

```bash
kubectl -n rook-ceph patch pvc rook-ceph-mon-b \
  --type=merge -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'
```

This requires the underlying StorageClass to support volume expansion (`allowVolumeExpansion: true`).

## Expanding Disk on Bare Metal

On bare metal, you can extend the filesystem if the underlying block device has free space:

```bash
# For LVM volumes
lvextend -L +20G /dev/vg-mon/lv-mon-b
resize2fs /dev/vg-mon/lv-mon-b

# Or for XFS
xfs_growfs /var/lib/ceph/mon/ceph-b
```

## Adjusting Thresholds

If you need to temporarily suppress the warning while planning disk expansion:

```bash
ceph config set mon mon_data_avail_warn 15
```

Restore to the default after resolving the issue:

```bash
ceph config rm mon mon_data_avail_warn
```

## Summary

`MON_DISK_LOW` warns that monitor data disk space is below 30% available. The fastest fix is to run `ceph tell mon.* compact` to reduce the RocksDB store. For sustained relief, expand the PVC in Rook or grow the underlying filesystem on bare metal. Adjust map epoch retention settings to slow future growth, and alert before hitting the critical threshold.
