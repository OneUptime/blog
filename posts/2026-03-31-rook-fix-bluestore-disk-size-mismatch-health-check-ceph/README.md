# How to Fix BLUESTORE_DISK_SIZE_MISMATCH Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, BlueStore, Disk, Capacity

Description: Learn how to resolve the BLUESTORE_DISK_SIZE_MISMATCH health warning in Ceph when BlueStore detects a discrepancy between the actual disk size and what is recorded in the OSD metadata.

---

## Understanding BLUESTORE_DISK_SIZE_MISMATCH

`BLUESTORE_DISK_SIZE_MISMATCH` fires when BlueStore detects that the size of the underlying block device differs from what was recorded when the OSD was created. This commonly happens when a disk is replaced with a larger one, when a VM disk is resized, or when a Kubernetes PVC is expanded but BlueStore has not been informed of the new size.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN bluestore block device size is larger than bluestore thinks
[WRN] BLUESTORE_DISK_SIZE_MISMATCH: osd.6 actual disk size is larger than bluestore size
    osd.6: actual=2.0 TiB > bluestore size=1.0 TiB
```

## Identifying the Mismatch

Check the recorded vs actual size for an OSD:

```bash
# Actual device size
blockdev --getsize64 /dev/sdX

# What BlueStore has recorded
ceph-bluestore-tool show-label --path /var/lib/ceph/osd/ceph-6
```

In Rook, check from the OSD pod:

```bash
kubectl -n rook-ceph exec -it <osd-6-pod> -- \
  ceph-bluestore-tool show-label --path /var/lib/ceph/osd/ceph-6
```

## Fix: Expand BlueStore to Use Full Disk

Tell BlueStore to expand to the new device size:

```bash
# Stop the OSD first
systemctl stop ceph-osd@6

# Expand BlueStore to use full device
ceph-bluestore-tool bluefs-bdev-expand --path /var/lib/ceph/osd/ceph-6

# Restart
systemctl start ceph-osd@6
```

In Rook, stop the OSD pod, exec into it, run the expand command, then let it restart:

```bash
# Scale down to 0 replicas
kubectl -n rook-ceph scale deployment rook-ceph-osd-6 --replicas=0

# Wait for pod to stop
kubectl -n rook-ceph wait --for=delete pod -l ceph-osd-id=6

# Start a debug pod or use the toolbox to run bluefs-bdev-expand
kubectl -n rook-ceph exec -it <toolbox-pod> -- \
  ceph-bluestore-tool bluefs-bdev-expand --path /var/lib/ceph/osd/ceph-6

# Scale back up
kubectl -n rook-ceph scale deployment rook-ceph-osd-6 --replicas=1
```

## Fix via OSD Replacement

For major size increases or if the direct expand does not work, replace the OSD:

```bash
# Mark out and wait for data migration
ceph osd out 6
ceph -w   # wait for active+clean

# Purge the OSD
ceph osd purge 6 --yes-i-really-mean-it

# Wipe and reprovision
wipefs --all /dev/sdX
ceph-volume lvm create --bluestore --data /dev/sdX
```

The new OSD will be created at the full disk size.

## Verifying the Fix

After expansion or replacement:

```bash
# Check OSD size was updated
ceph osd df | grep "osd.6"

# Check health
ceph health detail
```

The mismatch warning should be gone and the OSD should now report the larger capacity.

## Preventing Future Mismatches

When resizing PVCs in Rook, always trigger OSD expansion explicitly:

```bash
# After expanding PVC, restart OSD to trigger auto-detection
kubectl -n rook-ceph delete pod <osd-6-pod>
```

Rook automatically runs `bluefs-bdev-expand` when an OSD pod starts and detects a size increase on a PVC-backed device.

## Checking All OSDs for Mismatch

Find all OSDs with potential mismatches:

```bash
ceph health detail | grep BLUESTORE_DISK_SIZE
```

Or check the recorded block device size for each OSD via metadata:

```bash
for osd in $(ceph osd ls); do
  echo "osd.$osd: $(ceph osd metadata $osd | grep bluestore_bdev_size)"
done
```

## Summary

`BLUESTORE_DISK_SIZE_MISMATCH` warns that BlueStore's recorded device size does not match the actual block device size. Fix by running `ceph-bluestore-tool bluefs-bdev-expand` while the OSD is stopped - this updates the metadata and allows BlueStore to utilize the full device capacity. In Rook, restarting the OSD pod after a PVC expansion usually triggers this automatically.
