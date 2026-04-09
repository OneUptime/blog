# How to Enable Image-Level RBD Mirroring Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Image

Description: Learn how to enable image-level RBD mirroring in Rook-Ceph to selectively replicate specific block volumes to a secondary cluster.

---

## Image-Level Mirroring Overview

Image-level mirroring gives you granular control over which RBD images are replicated to a secondary cluster. Unlike pool-level mirroring, new images are NOT automatically mirrored - you must explicitly enable mirroring on each image you want to replicate.

This mode is preferred when:
- Only a subset of volumes require DR protection
- You want to mix journal-based and snapshot-based mirroring within the same pool
- Some images contain scratch or temporary data that does not need replication

## Step 1 - Enable Pool-Level Mode Set to Image

Configure the pool to use image-level mirroring mode:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror pool enable replicapool image
```

Verify the mode:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror pool info replicapool
```

```text
Mode: image
Peers:
  UUID: abc123
  Name: site-b
```

## Step 2 - Configure via Rook CephBlockPool CRD

Set the mirroring mode to image in the `CephBlockPool` spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  mirroring:
    enabled: true
    mode: image
    peers:
      secretNames:
      - rbd-mirror-peer-token
```

## Step 3 - Enable Mirroring on a Specific Image (Journal Mode)

Enable journal-based mirroring on a specific image:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd feature enable replicapool/critical-db journaling

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror image enable replicapool/critical-db journal
```

## Step 4 - Enable Mirroring on a Specific Image (Snapshot Mode)

Enable snapshot-based mirroring on an image (no `journaling` feature needed):

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror image enable replicapool/app-data snapshot
```

Add a snapshot schedule for automatic replication:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror snapshot schedule add --pool replicapool --image app-data 1h
```

## Step 5 - List All Mirrored Images

Check which images in the pool have mirroring enabled:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror pool status replicapool --verbose
```

```text
health: OK
daemon health: OK
image health: OK
images: 2 total
    2 replaying

IMAGES
replicapool/critical-db:
  global_id:   abc-123
  state:       up+replaying
  description: replaying, ...
replicapool/app-data:
  global_id:   def-456
  state:       up+replaying
  description: replaying, ...
```

## Step 6 - Disable Mirroring on an Image

When an image no longer needs replication, disable it:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror image disable replicapool/temp-data
```

## Step 7 - Manage Mirroring via VolumeReplication CRD

In Kubernetes, use the VolumeReplication CRD (from the CSI Addons project) to manage mirroring at the PVC level. First, create a `VolumeReplicationClass`:

```yaml
apiVersion: replication.storage.openshift.io/v1alpha1
kind: VolumeReplicationClass
metadata:
  name: rbd-volumereplicationclass
spec:
  provisioner: rook-ceph.rbd.csi.ceph.com
  parameters:
    mirroringMode: snapshot
    schedulingInterval: "1h"
    replication.storage.openshift.io/replication-secret-name: rook-csi-rbd-provisioner
    replication.storage.openshift.io/replication-secret-namespace: rook-ceph
```

Then, create a `VolumeReplication` resource referencing the PVC you want to mirror:

```yaml
apiVersion: replication.storage.openshift.io/v1alpha1
kind: VolumeReplication
metadata:
  name: critical-db-pvc-replication
  namespace: rook-ceph
spec:
  volumeReplicationClass: rbd-volumereplicationclass
  replicationState: primary
  dataSource:
    kind: PersistentVolumeClaim
    name: critical-db-pvc
```

## Summary

Image-level RBD mirroring in Rook-Ceph gives fine-grained control over which volumes are replicated to a secondary cluster. Enable it on the pool with `mode: image`, then explicitly enable mirroring on individual images choosing either journal or snapshot mode per image. This approach works well in mixed pools where only production workloads need DR protection while development and temporary volumes do not.
