# How to Fix BLUEFS_AVAILABLE_SPACE Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, BlueStore, BlueFS, Capacity

Description: Learn how to resolve the BLUEFS_AVAILABLE_SPACE health warning in Ceph when BlueFS reports insufficient available space on the DB or WAL device.

---

## Understanding BLUEFS_AVAILABLE_SPACE

`BLUEFS_AVAILABLE_SPACE` fires when the BlueFS internal filesystem detects that available space on a BlueStore sub-device (WAL or DB) has dropped below a threshold. Unlike `BLUEFS_SPILLOVER` which warns after overflow has already happened, this check warns that the device is getting full and spillover is imminent.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN bluefs available space is low
[WRN] BLUEFS_AVAILABLE_SPACE: osd.2 has low available space on db device
    osd.2: db device is 87% full (1.2 GiB / 10 GiB used)
```

## Checking BlueFS Space Per OSD

Get detailed BlueFS statistics:

```bash
# Per daemon stats
ceph daemon osd.2 perf dump | python3 -m json.tool | grep -E "bluefs|bluestore"

# Disk usage on the host
ls -lh /var/lib/ceph/osd/ceph-2/
```

In Rook, exec into the OSD pod:

```bash
kubectl -n rook-ceph exec -it <osd-2-pod> -- ls -lh /var/lib/ceph/osd/ceph-2/
```

Check block.db size vs usage:

```bash
kubectl -n rook-ceph exec -it <osd-2-pod> -- \
  ceph-bluestore-tool show-label --path /var/lib/ceph/osd/ceph-2
```

## Expanding the DB Device in Rook

The recommended fix is to expand the DB PVC:

```bash
# List OSD DB PVCs
kubectl -n rook-ceph get pvc | grep -E "db|metadata"

# Expand the DB PVC
kubectl -n rook-ceph patch pvc rook-ceph-osd-2-db \
  --type=merge -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'
```

Verify the resize is in progress:

```bash
kubectl -n rook-ceph describe pvc rook-ceph-osd-2-db | grep -A5 Conditions
```

After expansion, restart the OSD:

```bash
kubectl -n rook-ceph delete pod <osd-2-pod>
```

## Expanding on Bare Metal

For LVM-backed DB devices:

```bash
# Find the DB device path
ls -la /var/lib/ceph/osd/ceph-2/block.db

# Extend the logical volume
lvextend -L +20G /dev/vg-db/lv-osd2-db

# Inform BlueStore of the new size
ceph-bluestore-tool bluefs-bdev-expand \
  --path /var/lib/ceph/osd/ceph-2
```

For direct NVMe partitions, repartition or use LVM.

## Compacting RocksDB

RocksDB can accumulate tombstone entries and compaction overhead. Compact to reclaim space:

```bash
# Trigger compaction via the OSD daemon
ceph tell osd.2 compact

# Or use ceph-kvstore-tool (OSD must be stopped)
systemctl stop ceph-osd@2
ceph-kvstore-tool bluestore-kv /var/lib/ceph/osd/ceph-2 compact
systemctl start ceph-osd@2
```

## Monitoring BlueFS Space

Create a Prometheus alert for BlueFS space:

```yaml
- alert: BlueFSDBLow
  expr: |
    (ceph_bluestore_db_total_bytes - ceph_bluestore_db_used_bytes) /
    ceph_bluestore_db_total_bytes < 0.15
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "BlueFS DB device for {{ $labels.ceph_daemon }} is {{ $value | humanizePercentage }} free"
```

## Reconfiguring DB Device Sizing

When adding new OSDs, calculate proper DB device size:

```text
Recommended: 4% of OSD data capacity
Conservative: 56 GiB per 1 TiB of data (for write-heavy workloads)
Minimum: 1% of OSD data capacity
```

In Rook storage spec:

```yaml
- metadata:
    name: metadata
  spec:
    resources:
      requests:
        storage: 56Gi   # for a 1.4Ti data OSD
    storageClassName: fast-ssd
```

## Summary

`BLUEFS_AVAILABLE_SPACE` warns that the BlueFS DB or WAL sub-device is running low on space. Fix by expanding the DB PVC in Rook or the underlying LVM volume on bare metal, then restarting the OSD. As a supplementary measure, compact RocksDB to reclaim space from stale entries. Size DB devices at a minimum of 4% of OSD data capacity to prevent recurrence.
