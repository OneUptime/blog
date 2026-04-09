# How to Enable Journaling Feature on RBD Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Journaling, Mirroring, Storage

Description: Learn how to enable the journaling feature on RBD images in Ceph, which is required for journal-based mirroring and crash consistency guarantees.

---

## Overview

The journaling feature records all writes to an RBD image in a journal before they are applied to the image itself. This journal enables two key capabilities: crash-consistent replication (via RBD mirroring) and write-ordering guarantees that ensure data consistency after a crash. Enabling journaling does add some write overhead, so it is most appropriate for images that require mirroring or strict consistency guarantees.

## RBD Image Features

RBD images support several optional features. Journaling depends on the `exclusive-lock` feature being enabled first. Common features include:

- `layering` - enables cloning
- `exclusive-lock` - required for journaling
- `journaling` - records write-ahead journal
- `object-map` - tracks which objects exist
- `fast-diff` - accelerates diff calculations

## Enabling Journaling on a New Image

When creating a new image, specify the features explicitly:

```bash
rbd create --size 10G \
  --image-feature layering,exclusive-lock,journaling \
  replicapool/myimage

# Verify features
rbd info replicapool/myimage
```

## Enabling Journaling on an Existing Image

You can enable journaling on an existing image without recreating it:

```bash
# First ensure exclusive-lock is enabled
rbd feature enable replicapool/myimage exclusive-lock

# Then enable journaling
rbd feature enable replicapool/myimage journaling

# Confirm the change
rbd info replicapool/myimage | grep features
```

## Disabling Journaling

To disable journaling (this also stops mirroring if active):

```bash
# Disable journaling feature
rbd feature disable replicapool/myimage journaling
```

Note: disabling journaling on a mirrored image will break mirroring. Disable mirroring first if needed.

## Configuring Default Features

To make journaling the default for all new images in a pool, set the default image features:

```bash
# Set default features for new images
rbd config pool set replicapool rbd_default_features \
  "layering,exclusive-lock,object-map,fast-diff,journaling"

# Verify the configuration
rbd config pool get replicapool rbd_default_features
```

## Rook StorageClass with Journaling

In Rook, specify required image features in the StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-journaling
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering,exclusive-lock,object-map,fast-diff,journaling
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Monitoring Journal Size

Journaling uses additional RADOS objects. Monitor journal usage:

```bash
# Show journal details for an image
rbd journal info replicapool/myimage

# Check journal data size
rbd journal status replicapool/myimage
```

## Summary

Enabling the journaling feature on RBD images is essential for journal-based mirroring and crash-consistent replication. Always enable `exclusive-lock` before enabling `journaling`, and configure default image features at the pool level to ensure all new images inherit journaling. Use Rook StorageClass `imageFeatures` to automatically apply these features to dynamically provisioned PVCs.
