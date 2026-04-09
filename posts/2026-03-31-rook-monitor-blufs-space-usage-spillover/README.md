# How to Monitor BluFS Space Usage and Spillover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, BlueFS, Monitoring, Storage

Description: Learn how to monitor BlueFS space usage and spillover in Ceph, understand how RocksDB data is distributed across devices, and prevent OSD failures from disk exhaustion.

---

## What is BlueFS?

BlueFS is the embedded filesystem used by BlueStore to store RocksDB files, including the write-ahead log (WAL), sorted string tables (SSTs), and metadata. BlueFS can span multiple block devices: the main OSD device, a DB device (SSD), and a WAL device (fast SSD or NVMe).

## Understanding Spillover

Spillover occurs when BlueFS exhausts space on the fast DB device and begins writing overflow data to the slower main OSD device. This degrades performance but prevents data loss. Monitoring spillover is critical for capacity planning.

## Checking BlueFS Space Usage

View BlueFS stats for a specific OSD:

```bash
ceph daemon osd.0 bluestore allocator score block
ceph daemon osd.0 perf dump | jq '.bluefs'
```

Or use the admin socket for a human-readable summary:

```bash
ceph daemon osd.0 bluefs stats
```

This outputs a text-based usage matrix, not JSON. For structured data, use the `perf dump` command above, which includes these fields under the `bluefs` section:
- `db_total_bytes` - total DB device size
- `db_used_bytes` - used bytes on DB device
- `slow_total_bytes` - main device total bytes available to BlueFS
- `slow_used_bytes` - main device bytes used due to spillover

## Checking via ceph-bluestore-tool

When an OSD is offline, inspect BlueFS layout:

```bash
ceph-bluestore-tool bluefs-export --path /var/lib/ceph/osd/ceph-0 --out-dir /tmp/bluefs-export
```

Then check sizes:

```bash
du -sh /tmp/bluefs-export/*
```

## Prometheus Metrics for BlueFS

If you have the Ceph Prometheus exporter enabled, watch these metrics:

```bash
ceph_bluefs_db_total_bytes
ceph_bluefs_db_used_bytes
ceph_bluefs_slow_used_bytes
```

Create an alert when DB utilization exceeds 80%:

```yaml
- alert: CephBlueFSDBFull
  expr: ceph_bluefs_db_used_bytes / ceph_bluefs_db_total_bytes > 0.80
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "BlueFS DB device near capacity, spillover likely"
```

## Preventing Spillover

Increase the minimum DB size ratio:

```bash
ceph config set osd bluestore_bluefs_min_ratio 0.05
ceph config set osd bluestore_bluefs_gift_ratio 0.02
```

Or resize the DB device by migrating to a larger device using `ceph-bluestore-tool`.

## Reclaiming Space After Spillover

After expanding the DB device, reclaim spilled data:

```bash
ceph-bluestore-tool fsck --path /var/lib/ceph/osd/ceph-0
ceph-bluestore-tool bluefs-bdev-migrate --path /var/lib/ceph/osd/ceph-0 --devs-source /dev/sdc --dev-target /dev/nvme0n1
```

## Summary

BlueFS spillover degrades OSD performance when the DB device fills up and RocksDB files overflow to the main OSD device. Monitor spillover using `ceph daemon osd.X bluefs stats` and Prometheus metrics, set up alerts before reaching 80% DB utilization, and size DB devices generously relative to your write workload to avoid spillover in production.
