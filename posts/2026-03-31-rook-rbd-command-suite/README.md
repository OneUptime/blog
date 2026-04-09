# How to Use the rbd Command Suite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Block Storage, Kubernetes, Storage

Description: Learn to use the rbd command suite to create, manage, snapshot, and inspect Ceph block devices (RBD images) in Rook-Ceph deployments.

---

## Overview

The `rbd` command is the primary CLI for managing Ceph RADOS Block Device (RBD) images. These are the underlying block devices used for Kubernetes PersistentVolumes when you use the Rook-Ceph CSI driver. Understanding `rbd` commands is essential for inspecting volumes, taking manual snapshots, and troubleshooting PVC issues.

## Accessing the rbd Command

Run `rbd` from the Rook toolbox pod:

```bash
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- bash
```

## Listing RBD Images

```bash
# List all images in a pool
rbd ls replicapool

# List with detailed information
rbd ls --long replicapool

# List images in the CSI pool used by Kubernetes
rbd ls -p csi-rbd-pool
```

## Creating and Deleting Images

```bash
# Create a 10GB RBD image
rbd create --size 10240 replicapool/myvolume

# Create with specific features
rbd create --size 20480 --image-feature layering replicapool/myvolume2

# Delete an image
rbd rm replicapool/myvolume
```

## Inspecting an Image

```bash
# Show detailed info for an image
rbd info replicapool/myvolume

# Output includes: size, order, features, flags, create_timestamp, etc.

# Show disk usage
rbd du replicapool/myvolume
```

## Resizing Images

```bash
# Grow an image to 20GB
rbd resize --size 20480 replicapool/myvolume

# Shrink (requires --allow-shrink flag - use with caution)
rbd resize --size 5120 --allow-shrink replicapool/myvolume
```

## Working with Snapshots

```bash
# Create a snapshot
rbd snap create replicapool/myvolume@snap1

# List snapshots
rbd snap ls replicapool/myvolume

# Protect a snapshot (required before cloning)
rbd snap protect replicapool/myvolume@snap1

# Clone a snapshot to a new image
rbd clone replicapool/myvolume@snap1 replicapool/myvolume-clone

# Roll back to a snapshot
rbd snap rollback replicapool/myvolume@snap1

# Remove a snapshot
rbd snap unprotect replicapool/myvolume@snap1
rbd snap rm replicapool/myvolume@snap1
```

## Exporting and Importing Images

```bash
# Export an image to a file
rbd export replicapool/myvolume /tmp/myvolume.img

# Import from a file
rbd import /tmp/myvolume.img replicapool/myvolume-restored

# Export only changes since a snapshot (incremental diff)
rbd export-diff --from-snap snap1 replicapool/myvolume /tmp/diff.img
```

## Watching Live I/O Statistics

```bash
# Watch real-time I/O stats for an image
rbd perf image iostat --pool=replicapool
```

## Identifying Kubernetes PVC Images

Kubernetes CSI provisioner uses a naming convention for RBD images. Find the image backing a PVC:

```bash
# Get the volume handle from a PV
kubectl get pv pvc-abc123 -o jsonpath='{.spec.csi.volumeHandle}'

# The last segment of the handle is the RBD image name
# Format: pool-name/imageName (cluster-id:pool-id:image-id)
rbd info csi-rbd-pool/csi-vol-abc123
```

## Summary

The `rbd` command suite provides comprehensive control over Ceph block device images including creation, resizing, snapshotting, cloning, and export. For Kubernetes operators using Rook-Ceph, these commands are invaluable for manual volume management, disaster recovery, and deep inspection of PVC-backed storage. Always verify the target pool name matches what your StorageClass specifies before modifying images.
