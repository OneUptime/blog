# How to Manage RBD Images from the Ceph Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, RBD, Block Storage

Description: Create, resize, clone, and snapshot RBD block storage images using the Ceph Dashboard GUI for Rook-managed clusters.

---

## Overview

RBD (RADOS Block Device) images are Ceph's block storage primitive. The Ceph Dashboard provides a full GUI for managing RBD images including creating images, taking snapshots, cloning, and monitoring usage without using the rbd CLI.

## Accessing RBD Management

```bash
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr-dashboard 8443:8443
# Navigate to: https://localhost:8443/#/block/rbd
```

The RBD image list shows:
- Image name and parent pool
- Size and used capacity
- Features enabled (layering, fast-diff, etc.)
- Snapshot count
- Protection status

## Creating an RBD Image

Click "Create" in the RBD Images section:

- **Name**: image name (unique within pool)
- **Pool**: select the RBD pool
- **Size**: storage capacity (e.g., 100 GiB)
- **Features**: enable layering (required for snapshots/clones)
- **Object size**: default 4 MiB is good for most workloads

CLI equivalent:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd create replicapool/my-image \
  --size 102400 \
  --image-feature layering
```

## Taking Snapshots

With an image selected, click "Create Snapshot":

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd snap create replicapool/my-image@snap-1

# List snapshots
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd snap ls replicapool/my-image
```

## Protecting and Cloning Snapshots

To clone an image (for thin-provisioned copies), protect the snapshot first:

```bash
# Protect snapshot
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd snap protect replicapool/my-image@snap-1

# Clone the protected snapshot
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd clone replicapool/my-image@snap-1 replicapool/my-image-clone
```

The Dashboard's Clone action performs both protect and clone in one step.

## Resizing an RBD Image

Select an image, click "Edit", and change the size. Only size increases are supported:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd resize replicapool/my-image --size 204800

# If mounted, resize the filesystem too
kubectl exec my-pod -- resize2fs /dev/rbd0
```

## Monitoring RBD Image Usage

The Dashboard shows per-image disk usage. For accurate data:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd du replicapool/my-image

# All images in pool
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd du replicapool
```

## Enabling Fast-Diff for Better Usage Reporting

The `fast-diff` feature dramatically speeds up `rbd du`:

```bash
# object-map must be enabled before fast-diff (fast-diff depends on object-map)
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd feature enable replicapool/my-image object-map

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd feature enable replicapool/my-image fast-diff
```

## Summary

The Ceph Dashboard RBD Images section provides a GUI for full RBD lifecycle management. Creating images, taking snapshots, cloning protected snapshots, and resizing volumes are all available without CLI access. Enabling the `fast-diff` and `object-map` features on images ensures accurate disk usage reporting in the Dashboard's usage column.
