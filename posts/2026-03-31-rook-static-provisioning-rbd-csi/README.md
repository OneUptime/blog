# How to Configure Static Provisioning for RBD in Rook CSI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CSI, RBD, Kubernetes

Description: Learn how to use static provisioning for RBD volumes in Rook CSI to create PersistentVolumes from pre-existing Ceph block images.

---

## What Is Static Provisioning

Dynamic provisioning creates new Ceph RBD images automatically when a PVC is created. Static provisioning is the opposite - you pre-create the RBD image in Ceph, then manually create a `PersistentVolume` in Kubernetes that references that existing image. This is useful for migrating data from an existing Ceph cluster, pre-creating large volumes, or attaching shared images with special features already configured.

## Pre-Creating the RBD Image

First, create the RBD image in the Ceph pool using the toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

rbd create --pool replicapool --image my-static-image --size 50G
rbd info replicapool/my-static-image
```

Note the image ID from the output:

```text
rbd image 'my-static-image':
  size 50 GiB in 12800 objects
  order 22 (4 MiB objects)
  id: abc123def456
```

## Creating the Static PersistentVolume

Create a PV that references the existing RBD image using the Rook CSI driver:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: static-rbd-pv
spec:
  accessModes:
    - ReadWriteOnce
  capacity:
    storage: 50Gi
  csi:
    driver: rook-ceph.rbd.csi.ceph.com
    nodeStageSecretRef:
      name: rook-csi-rbd-node
      namespace: rook-ceph
    volumeAttributes:
      clusterID: rook-ceph
      pool: replicapool
      imageName: my-static-image
      imageFeatures: layering
      staticVolume: "true"
    volumeHandle: 0001-0024-rook-ceph-0000000000000001-abc123def456
  persistentVolumeReclaimPolicy: Retain
  storageClassName: rook-ceph-block
  volumeMode: Block
```

The `volumeHandle` must follow the format: `<clusterID>-<prefix>-<pool-id>-<image-id>`. Get the correct pool ID:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd dump | grep "replicapool"
```

## Creating the Matching PVC

Create a PVC that references the static PV by name:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: static-rbd-pvc
  namespace: my-app
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: rook-ceph-block
  volumeName: static-rbd-pv
```

The `volumeName` field binds the PVC to the specific pre-created PV.

## Verifying the Binding

Check that the PVC and PV are bound:

```bash
kubectl get pvc static-rbd-pvc -n my-app
kubectl get pv static-rbd-pv
```

Both should show `Bound` status. The PVC can then be used in any pod spec like a dynamically provisioned volume.

## Static Provisioning for Snapshots

You can also statically provision from an existing RBD snapshot by specifying the snapshot ID in the volume handle and setting `imageFeatures` appropriately. This is useful for creating read-only volumes from a snapshot for analytics workloads.

## Summary

Static provisioning for RBD in Rook CSI allows you to attach pre-existing Ceph block images to Kubernetes workloads without dynamic provisioner involvement. Create the RBD image first, construct a PV with `staticVolume: "true"` in the volume attributes and the correct volume handle, then create a matching PVC that references that PV by name. Use `Retain` as the reclaim policy to prevent accidental deletion of the image.
