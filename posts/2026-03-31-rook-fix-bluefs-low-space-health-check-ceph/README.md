# How to Fix BLUEFS_LOW_SPACE Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, BlueStore, BlueFS, Space

Description: Learn how to resolve the BLUEFS_LOW_SPACE health warning in Ceph when the internal BlueFS filesystem reports critically low space on a BlueStore OSD device.

---

## Understanding BLUEFS_LOW_SPACE

`BLUEFS_LOW_SPACE` is a more severe form of `BLUEFS_AVAILABLE_SPACE`. It fires when BlueFS space drops to a critical level - at this point, RocksDB operations may start failing, which can cause OSD crashes or data corruption. This warning requires immediate attention.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN bluefs free space is critically low
[WRN] BLUEFS_LOW_SPACE: osd.7 has critically low space on wal device
    osd.7: wal device is 97% full (9.7 GiB / 10 GiB used)
```

## Emergency Assessment

Immediately check all affected OSDs:

```bash
# Check all OSDs for BlueFS issues
ceph health detail | grep -A2 BLUEFS

# List OSD daemon stats
for osd in $(ceph osd ls); do
  echo "=== osd.$osd ==="
  ceph daemon osd.$osd perf dump 2>/dev/null | python3 -m json.tool | grep bluefs_wal_total_bytes || true
done
```

In Rook, check from the toolbox:

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- \
  bash -c "for i in \$(ceph osd ls); do echo osd.\$i; ceph daemon osd.\$i perf dump | grep bluefs_wal; done"
```

## Immediate Fix: Compact and Free Space

First, try compaction to free RocksDB overhead:

```bash
ceph tell osd.7 compact
```

Check if space was recovered:

```bash
ceph daemon osd.7 perf dump | grep bluefs
```

## Moving WAL Data to the DB Device

If the WAL device is critically full, migrate WAL data to the larger DB device:

```bash
# Stop the OSD
systemctl stop ceph-osd@7

# Migrate WAL to DB device
ceph-bluestore-tool bluefs-bdev-migrate \
  --path /var/lib/ceph/osd/ceph-7 \
  --devs-source /var/lib/ceph/osd/ceph-7/block.wal \
  --dev-target /var/lib/ceph/osd/ceph-7/block.db

# Restart OSD
systemctl start ceph-osd@7
```

## Expanding the WAL Device in Rook

For Rook deployments with a separate WAL PVC:

```bash
# Find WAL PVC
kubectl -n rook-ceph get pvc | grep wal

# Expand
kubectl -n rook-ceph patch pvc rook-ceph-osd-7-wal \
  --type=merge -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'
```

## Reconfiguring BlueStore WAL/DB Split

Adjust the WAL size for future OSD deployments. Note that this setting only takes effect when creating new OSDs, not for existing ones:

```bash
ceph config set osd bluestore_block_wal_size 536870912  # 512MB WAL
```

To apply to an existing OSD, you must recreate it. After reprovisioning, restart the OSD:

```bash
kubectl -n rook-ceph delete pod <osd-7-pod>
```

## Removing the Dedicated WAL Device

If the WAL device is too small to be beneficial, remove it and use only the DB device (or main block device):

```bash
# Stop OSD
systemctl stop ceph-osd@7

# Migrate WAL data to DB device
ceph-bluestore-tool bluefs-bdev-migrate \
  --path /var/lib/ceph/osd/ceph-7 \
  --devs-source /var/lib/ceph/osd/ceph-7/block.wal \
  --dev-target /var/lib/ceph/osd/ceph-7/block.db

# Remove the WAL symlink and rely on DB device
rm /var/lib/ceph/osd/ceph-7/block.wal

# Restart OSD without dedicated WAL device
systemctl start ceph-osd@7
```

## Monitoring BlueFS WAL Space

```yaml
- alert: BlueFSWALCritical
  expr: |
    ceph_bluefs_wal_total_bytes > 0 and
    (ceph_bluefs_wal_total_bytes - ceph_bluefs_wal_used_bytes) /
    ceph_bluefs_wal_total_bytes < 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "BlueFS WAL on {{ $labels.ceph_daemon }} is critically full"
```

## Summary

`BLUEFS_LOW_SPACE` is a critical warning that BlueFS has nearly exhausted its space on a WAL or DB device. Immediately compact the OSD to reclaim overhead, then migrate WAL data to the larger DB device or expand the device PVC. For Rook deployments, resize the WAL or DB PVC and restart the OSD. If the WAL device is consistently too small, remove it and allow BlueFS to use only the DB device.
