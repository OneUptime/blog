# How to Fix MON_DISK_BIG Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Monitor, Disk, Compaction

Description: Learn how to resolve the MON_DISK_BIG health warning in Ceph when the monitor store grows too large, and how to reduce it through compaction and epoch trimming.

---

## Understanding MON_DISK_BIG

`MON_DISK_BIG` fires when the monitor's on-disk data store exceeds a threshold (default 15 GiB). Unlike `MON_DISK_LOW` which warns about available space, `MON_DISK_BIG` is about the absolute size of the monitor data directory itself. A large monitor store can slow down syncing when a new monitor joins or after a restart.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN mon store is large
[WRN] MON_DISK_BIG: mon.a store is 17 GiB >= 15 GiB (mon_data_size_warn)
```

## Inspecting Monitor Store Size

Check the actual size of each monitor's data directory:

```bash
du -sh /var/lib/ceph/mon/ceph-*/
```

The monitor store is a RocksDB database. Its size grows as PG map, OSD map, and Paxos history accumulate over time.

## Compacting the Monitor Store

The most immediate fix is to compact the RocksDB store:

```bash
ceph tell mon.* compact
```

Or target a specific monitor:

```bash
ceph tell mon.a compact
```

After compaction, check size reduction:

```bash
du -sh /var/lib/ceph/mon/ceph-a/
```

Compaction can reduce the store by 30-70% in typical cases.

## Trimming OSD Map History

Ceph retains historical OSD maps for a configurable number of epochs. Reduce retention:

```bash
ceph config set mon mon_min_osdmap_epochs 200
```

Verify the current setting:

```bash
ceph config get mon mon_min_osdmap_epochs
```

After lowering the retention setting, monitors will automatically trim old epochs. Verify the current OSD map epoch with:

```bash
ceph osd stat
```

Then compact the store to reclaim space:

```bash
ceph tell mon.* compact
```

## Reducing PG Map History

Excessive PG map versions also contribute to store size:

```bash
ceph config set mon paxos_trim_min 10
ceph config set mon paxos_trim_max 500
```

## Adjusting the Warning Threshold

If your cluster legitimately produces more map data (large cluster, high churn), raise the threshold:

```bash
ceph config set mon mon_data_size_warn 32212254720  # 30 GiB in bytes
```

Check the current setting:

```bash
ceph config get mon mon_data_size_warn
```

## Enabling Automatic Compaction

Configure monitors to compact automatically:

```bash
ceph config set mon mon_compact_on_start true
ceph config set mon mon_compact_on_trim true
```

This ensures compaction happens whenever the monitor trims old data.

## In Rook Deployments

Rook monitors inherit `ceph.conf` settings via the ConfigMap:

```bash
kubectl -n rook-ceph get configmap rook-ceph-config -o yaml
```

Add compaction settings via the CephCluster config override:

```yaml
spec:
  cephConfig:
    mon:
      mon_compact_on_trim: "true"
      mon_compact_on_start: "true"
      mon_min_osdmap_epochs: "200"
```

Apply and restart monitors:

```bash
kubectl -n rook-ceph rollout restart deployment -l app=rook-ceph-mon
```

## Summary

`MON_DISK_BIG` warns that the Ceph monitor RocksDB store has grown beyond the size threshold. Fix this by running `ceph tell mon.* compact` to defragment the store, reducing map history retention settings, and enabling automatic compaction on trim and startup. For large clusters, raise the threshold to match expected store sizes and monitor growth trends over time.
