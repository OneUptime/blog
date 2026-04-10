# How to Configure RBD Exclusive Locking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Locking, Block Storage

Description: Learn how RBD exclusive locking works in Ceph and how to configure it correctly for safe single-writer block device access in Rook-Ceph.

---

## What Is RBD Exclusive Locking

RBD exclusive locking is a feature that ensures only one client can write to an RBD image at a time. Without exclusive locking, multiple writers could corrupt the image's internal data structures. The `exclusive-lock` feature is enabled by default on all RBD images created with format 2.

Exclusive locking works by:
- Requiring a client to acquire a lock before performing writes
- Automatically breaking stale locks from dead clients
- Coordinating with the `object-map` and `fast-diff` features that depend on it

## Checking Lock Status

To see which client holds the lock on an image:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd lock ls replicapool/myimage
```

Sample output:

```text
There is 1 exclusive lock on this image.
Locker   ID                       Address
client.1 auto 18446744073709551615 192.168.1.5:0/1234
```

## Checking Image Features

Verify the `exclusive-lock` feature is enabled:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd info replicapool/myimage | grep features
```

Expected output:

```text
features: layering, exclusive-lock, object-map, fast-diff, deep-flatten
```

## Enabling Exclusive Lock on Existing Images

If the feature is missing from an older image, enable it while the image is unmapped:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd feature enable replicapool/myimage exclusive-lock
```

## Configuring Exclusive Lock in the StorageClass

Rook passes RBD configuration through the `StorageClass`. Include `exclusive-lock` in the `imageFeatures` parameter:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering,exclusive-lock,object-map,fast-diff,deep-flatten
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Manually Breaking a Stale Lock

If a client crashes and holds a stale lock, break it manually:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd lock rm replicapool/myimage "auto 18446744073709551615" client.1
```

After breaking the lock, the next writer will acquire a fresh lock automatically.

## Exclusive Lock and RWX Access Modes

RBD with filesystem volume mode is incompatible with `ReadWriteMany` access mode. For multi-writer scenarios with a shared filesystem, use CephFS instead. RBD does support `ReadWriteMany` when using raw block volume mode (`volumeMode: Block`), but the application must handle concurrent access safely.

## Summary

RBD exclusive locking in Rook-Ceph ensures single-writer safety for block volumes and is enabled by default on format 2 images. Configure it via `imageFeatures` in the StorageClass, verify lock status with `rbd lock ls`, and break stale locks manually when a client crashes without releasing its lock. For multi-writer access patterns, CephFS is the appropriate storage type.
