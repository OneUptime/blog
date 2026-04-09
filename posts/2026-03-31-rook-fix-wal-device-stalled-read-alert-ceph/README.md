# How to Fix WAL_DEVICE_STALLED_READ_ALERT Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, BlueStore, WAL, Performance

Description: Learn how to diagnose and resolve the WAL_DEVICE_STALLED_READ_ALERT health check in Ceph when the BlueStore Write-Ahead Log device reports slow or stalled reads.

---

## Understanding WAL_DEVICE_STALLED_READ_ALERT

`WAL_DEVICE_STALLED_READ_ALERT` fires when BlueStore detects stalled or excessively slow read operations on the WAL (Write-Ahead Log) device. The WAL device is typically the fastest storage in the BlueStore setup (NVMe) since it handles the most latency-sensitive writes. A stall here indicates either hardware failure or a misconfigured/overloaded NVMe device.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN WAL device stalled reads
[WRN] WAL_DEVICE_STALLED_READ_ALERT: osd.4 WAL device is experiencing stalled reads
    osd.4: 8 WAL reads stalled > 10s in the last 30 minutes
```

## Identifying the WAL Device

Find the WAL device path for the affected OSD:

```bash
# Check OSD metadata
ceph osd metadata 4 | python3 -m json.tool | grep -E '"bluestore_block_wal_|devname"'

# Or check the OSD directory
ls -la /var/lib/ceph/osd/ceph-4/ | grep wal

# Follow the symlink
readlink -f /var/lib/ceph/osd/ceph-4/block.wal
```

## Diagnosing WAL Device Performance

Measure actual device latency:

```bash
WAL_DEV=/dev/nvme0n1p1  # replace with actual WAL device

# Check I/O stats
iostat -xz 1 10 $WAL_DEV

# Test with fio (read test)
fio --filename=$WAL_DEV --rw=randread --bs=4k --numjobs=1 \
    --ioengine=libaio --iodepth=16 --runtime=30 \
    --name=wal-read-test --readonly

# Check SMART data
smartctl -a $WAL_DEV
```

## NVMe-Specific Diagnostics

For NVMe WAL devices, check NVMe health:

```bash
nvme smart-log /dev/nvme0
nvme error-log /dev/nvme0
```

Key metrics to check:
- `critical_warning`: Should be 0
- `media_errors`: Should be 0
- `percentage_used`: NVMe wear level

```bash
nvme smart-log /dev/nvme0 | grep -E "critical|error|percentage|unsafe"
```

## Fix: NVMe Power State Issues

NVMe drives have power states that can cause latency spikes. Disable APST (Autonomous Power State Transition):

```bash
# Check current power state
nvme get-feature /dev/nvme0 -f 0x0c -H

# Disable APST
nvme set-feature /dev/nvme0 -f 0x0c -v 0

# Or via kernel parameter (persistent)
echo "options nvme_core default_ps_max_latency_us=0" > /etc/modprobe.d/nvme.conf
update-initramfs -u
```

## Fix: Reduce WAL Device Load

If the WAL device is overwhelmed, reduce WAL size to limit what BlueStore writes there:

```bash
ceph config set osd.4 bluestore_block_wal_size 268435456  # 256MB
```

Restart the OSD to apply:

```bash
kubectl -n rook-ceph delete pod <osd-4-pod>
```

## Fix: Migrate WAL to DB Device

If the WAL device is consistently underperforming, move WAL data to the DB device:

```bash
# Stop OSD
systemctl stop ceph-osd@4

# Migrate WAL to DB device
ceph-bluestore-tool bluefs-bdev-migrate \
  --path /var/lib/ceph/osd/ceph-4 \
  --devs-source /var/lib/ceph/osd/ceph-4/block.wal \
  --dev-target /var/lib/ceph/osd/ceph-4/block.db

# Remove WAL symlink
rm /var/lib/ceph/osd/ceph-4/block.wal

# Restart
systemctl start ceph-osd@4
```

## In Rook Deployments

Check WAL PVC performance:

```bash
kubectl -n rook-ceph get pvc | grep wal

# Check StorageClass
kubectl get storageclass <wal-storage-class> -o yaml | grep provisioner
```

If the WAL StorageClass does not provide low-latency NVMe storage, consider changing it:

```bash
kubectl -n rook-ceph edit cephcluster rook-ceph
# Update the WAL volumeClaimTemplate storageClassName
```

## Summary

`WAL_DEVICE_STALLED_READ_ALERT` indicates the BlueStore WAL device is experiencing stalled reads. Diagnose with SMART and `fio` tests. Fix NVMe power management issues by disabling APST. Reduce WAL size to limit device load, or migrate WAL data to the DB device if the WAL device is unsuitable. For Rook deployments, ensure the WAL StorageClass provides truly low-latency NVMe-backed storage.
