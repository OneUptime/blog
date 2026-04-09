# How to Fix BLUEFS_SPILLOVER Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, BlueStore, BlueFS, Storage

Description: Learn how to resolve the BLUEFS_SPILLOVER health warning in Ceph when BlueFS data spills over from the WAL or DB device onto the main OSD data device.

---

## Understanding BLUEFS_SPILLOVER

BlueStore uses BlueFS as an internal file system for its RocksDB metadata store. BlueFS can be configured to use separate fast devices (NVMe/SSD) for the WAL (Write-Ahead Log) and DB (RocksDB metadata). `BLUEFS_SPILLOVER` fires when BlueFS data that should be on the dedicated WAL or DB device has spilled over onto the main OSD data device because the dedicated device ran out of space.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN bluefs spillover detected
[WRN] BLUEFS_SPILLOVER: osd.3 has metadata spilling to data device
    osd.3: 4.5 GiB spilling to data device (db is 95% full)
```

## Understanding BlueFS Devices

BlueStore OSD layout:
- **Block (data)**: Main OSD data device (usually HDD)
- **Block.db**: RocksDB metadata (usually SSD)
- **Block.wal**: Write-Ahead Log (fastest device, NVMe)

When `block.db` fills up, BlueFS writes overflow to the main `block` device. This is spillover, and it degrades performance because metadata is now on a slow device.

## Checking BlueFS Usage

Inspect BlueFS space usage for each OSD:

```bash
ceph daemon osd.3 perf dump | python3 -m json.tool | grep -i bluefs
```

Or use the BlueStore debug command:

```bash
ceph daemon osd.3 bluefs stats
```

This shows the allocation across WAL, DB, and main devices.

## Option 1: Expand the DB Device

The ideal fix is to increase the size of the DB device. In Rook, this means resizing the PVC used as the DB device:

```bash
# Check current DB PVC
kubectl -n rook-ceph get pvc | grep db

# Resize the DB PVC
kubectl -n rook-ceph patch pvc rook-ceph-osd-3-db \
  --type=merge -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'
```

After resizing, restart the OSD to allow BlueFS to use the new space:

```bash
kubectl -n rook-ceph delete pod <osd-3-pod>
```

## Option 2: Move Spillover Data Back

After expanding the DB device, instruct BlueFS to migrate the spilled data back:

```bash
# Check current spillover
ceph daemon osd.3 bluestore bluefs device info

# Initiate migration of data back to the DB device
ceph-bluestore-tool bluefs-bdev-migrate \
  --path /var/lib/ceph/osd/ceph-3 \
  --devs-source /var/lib/ceph/osd/ceph-3/block \
  --dev-target /var/lib/ceph/osd/ceph-3/block.db
```

This requires stopping the OSD first:

```bash
systemctl stop ceph-osd@3
# Run migration
systemctl start ceph-osd@3
```

## Option 3: Remove the DB Device

If spillover is persistent and the DB device is too small to be useful:

```bash
# Migrate all data from the DB device back to the main block device
ceph-bluestore-tool bluefs-bdev-migrate \
  --path /var/lib/ceph/osd/ceph-3 \
  --devs-source /var/lib/ceph/osd/ceph-3/block.db \
  --dev-target /var/lib/ceph/osd/ceph-3/block
```

This requires stopping the OSD first. The source DB device is removed on success. The RocksDB metadata will then live entirely on the main data device (no more spillover, but slower performance).

## Preventing Spillover

Size your DB device appropriately. A rule of thumb is 4% of the OSD data capacity for RocksDB metadata:

```text
100GB OSD -> 4GB DB device minimum
1TB OSD -> 40GB DB device minimum
```

In Rook CephCluster spec:

```yaml
spec:
  storage:
    storageClassDeviceSets:
    - name: set1
      volumeClaimTemplates:
      - metadata:
          name: data
        spec:
          resources:
            requests:
              storage: 1Ti
      - metadata:
          name: metadata  # DB device
        spec:
          resources:
            requests:
              storage: 40Gi
          storageClassName: fast-nvme
```

## Summary

`BLUEFS_SPILLOVER` means the BlueStore DB or WAL device is full and metadata is spilling onto the slower main data device. Fix by expanding the DB device PVC, then restarting the OSD to utilize the new space. For persistent spillover, use `ceph-bluestore-tool` to migrate spilled data back. Size DB devices at 4% of OSD capacity to prevent future spillover.
