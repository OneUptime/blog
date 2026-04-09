# How to Use rbd-nbd for RBD Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, rbd-nbd, Debugging, Block Storage

Description: Use rbd-nbd to map Ceph RBD images as local NBD block devices for low-level debugging, data recovery, and testing without requiring a kernel RBD driver.

---

## What is rbd-nbd

`rbd-nbd` maps Ceph RBD (RADOS Block Device) images to Linux NBD (Network Block Device) devices in userspace. Unlike the kernel RBD driver, it runs as a daemon and provides more configuration options and debugging capabilities.

## Prerequisites

```bash
# Install rbd-nbd
apt-get install -y rbd-nbd   # Debian/Ubuntu
yum install -y rbd-nbd       # RHEL/CentOS

# Load the NBD kernel module
modprobe nbd max_part=16
```

## Map an RBD Image

```bash
# Map a Ceph RBD image to a local block device
rbd-nbd map rbd/myimage \
  --conf /etc/ceph/ceph.conf \
  --keyring /etc/ceph/ceph.client.admin.keyring

# The command returns the device path, e.g., /dev/nbd0
# Verify the mapping
rbd-nbd list-mapped
```

## Get Config from Rook PVC

For debugging a Kubernetes PVC backed by RBD:

```bash
# Find the RBD image name from the PV
kubectl get pv pvc-xxxxx -o jsonpath='{.spec.csi.volumeAttributes.imageName}'

# Get the pool name
kubectl get pv pvc-xxxxx -o jsonpath='{.spec.csi.volumeAttributes.pool}'

# Extract admin keyring from Rook
kubectl -n rook-ceph get secret rook-ceph-admin-keyring \
  -o jsonpath='{.data.keyring}' | base64 -d > /tmp/keyring

# Map the image
rbd-nbd map <pool>/<imagename> \
  --conf /tmp/ceph.conf \
  --keyring /tmp/keyring
```

## Mount and Inspect the Filesystem

```bash
# Mount the mapped device for inspection
mkdir -p /mnt/rbd-debug
mount /dev/nbd0 /mnt/rbd-debug

# Inspect filesystem
ls -la /mnt/rbd-debug
df -h /mnt/rbd-debug

# Unmount before running filesystem checks
umount /mnt/rbd-debug

# Run fsck on the unmounted block device
fsck.ext4 /dev/nbd0

# Or check XFS
xfs_repair -n /dev/nbd0  # dry-run check
```

## Enable Debug Logging

```bash
# Map with verbose logging
rbd-nbd map rbd/myimage \
  --conf /tmp/ceph.conf \
  --keyring /tmp/keyring \
  --log-file /tmp/rbd-nbd-debug.log \
  --debug-rbd 20 --debug-ms 1
```

## Test Read/Write Performance

```bash
# Basic throughput test on the NBD device
dd if=/dev/nbd0 of=/dev/null bs=4M count=100 iflag=direct

dd if=/dev/zero of=/dev/nbd0 bs=4M count=100 oflag=direct
```

## Unmap the Device

```bash
# Graceful unmap
rbd-nbd unmap /dev/nbd0

# Force unmap if busy (kill the rbd-nbd daemon for the device)
rbd-nbd detach /dev/nbd0

# Verify no mappings remain
rbd-nbd list-mapped
```

## Summary

`rbd-nbd` provides userspace RBD image mapping that is more flexible and debuggable than the kernel driver. It is particularly useful for inspecting the filesystem on a PVC that a pod cannot mount, running fsck on potentially corrupted images, and testing block device performance without Kubernetes CSI overhead.
