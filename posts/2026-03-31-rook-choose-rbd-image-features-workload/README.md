# How to Choose RBD Image Features for Your Workload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Configuration, Storage

Description: Choose the right RBD image features for your Kubernetes workload by understanding what layering, fast-diff, object-map, journaling, and deep-flatten do and when to enable them.

---

## RBD Image Features Overview

RBD images support optional features that add capabilities at the cost of overhead. Choosing the wrong combination can cause compatibility issues with the kernel driver or degrade performance unnecessarily. Key features include:

- `layering`: enables clones and copy-on-write snapshots
- `exclusive-lock`: prevents multiple writers from corrupting the image
- `object-map`: tracks which RADOS objects exist, speeding up snaps and exports
- `fast-diff`: accelerates diff operations by using the object map
- `deep-flatten`: allows flattening parent snapshots when clones exist
- `journaling`: enables asynchronous journaling for RBD mirroring
- `data-pool`: allows storing data in a separate EC pool

## Default Features in Rook

Rook CSI typically enables these features by default:

```yaml
imageFeatures: layering,exclusive-lock,object-map,fast-diff,deep-flatten
```

Check features on an existing image:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd info replicapool/my-volume | grep features
```

## Feature Selection by Workload

**Database (PostgreSQL, MySQL):**

```bash
rbd create replicapool/pg-data --size 100G \
  --image-feature layering,exclusive-lock,object-map,fast-diff
```

Avoid `journaling` - databases manage their own WAL. Exclusive-lock prevents concurrent corruption.

**Virtual Machine disks:**

```bash
rbd create vm-pool/vm-disk --size 50G \
  --image-feature layering,exclusive-lock,object-map,fast-diff,deep-flatten
```

Deep-flatten allows cloning from snapshots and later flattening the clone independently.

**RBD Mirroring:**

```bash
rbd create mirror-pool/replicated --size 100G \
  --image-feature layering,exclusive-lock,object-map,fast-diff,journaling
```

Journaling is required for RBD mirroring in journal-based mode.

**Read-only static data:**

```bash
rbd create static-pool/dataset --size 500G \
  --image-feature layering
```

Minimal features for read-only snapshots reduce overhead.

## Enabling or Disabling Features on Existing Images

Enable a feature:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd feature enable replicapool/my-volume object-map
```

Disable a feature (image must be unmapped):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd feature disable replicapool/my-volume journaling
```

## Kernel Driver Feature Support

The kernel RBD driver supports fewer features than librbd. When mounting with the kernel driver, limit features to what the kernel version supports:

```bash
# Safe set for kernel driver
rbd create replicapool/kernel-vol --size 50G \
  --image-feature layering,exclusive-lock
```

Check kernel RBD supported features:

```bash
cat /sys/bus/rbd/supported_features
```

## Setting Default Features

Configure the default feature set globally:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client rbd_default_features 61
```

The value 61 corresponds to: layering (1) + exclusive-lock (4) + object-map (8) + fast-diff (16) + deep-flatten (32).

## Summary

RBD image features enable advanced capabilities but carry overhead and compatibility constraints. Use layering, exclusive-lock, object-map, and fast-diff for most Kubernetes PVC workloads. Add deep-flatten for VM cloning workflows and journaling only when configuring RBD mirroring. Restrict to layering and exclusive-lock when using the kernel driver on older kernels.
