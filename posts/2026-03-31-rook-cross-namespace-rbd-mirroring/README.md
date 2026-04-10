# How to Set Up Cross-Namespace RBD Mirroring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Kubernetes, Namespace

Description: Learn how to configure RBD mirroring across different Kubernetes namespaces, allowing workloads in separate namespaces to share mirrored block storage.

---

## Overview

Cross-namespace RBD mirroring in a Rook/Ceph environment allows PersistentVolumeClaims in different Kubernetes namespaces to use mirrored block pools. This is useful in multi-tenant environments where teams share a single Ceph cluster but operate in isolated namespaces.

## Architecture

In Rook, the `CephBlockPool` resides in the `rook-ceph` namespace, but PVCs can be created in any namespace by referencing a `StorageClass`. Cross-namespace mirroring requires proper RBAC configuration so that the CSI driver can access secrets across namespaces.

## Setting Up the Block Pool with Mirroring

Create a mirrored block pool in the Rook namespace:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: mirrored-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  mirroring:
    enabled: true
    mode: image
    snapshotSchedules:
      - interval: 1h
        startTime: "00:00:00"
```

## Configuring StorageClass for Cross-Namespace Use

Create a `StorageClass` that references the mirrored pool. StorageClasses are cluster-scoped, so they are accessible from all namespaces:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-mirrored
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: mirrored-pool
  imageFormat: "2"
  imageFeatures: layering,journaling,exclusive-lock,object-map,fast-diff
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
```

## Creating PVCs in Different Namespaces

Any namespace can now claim storage from the mirrored pool:

```yaml
# In namespace: team-alpha
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: alpha-data
  namespace: team-alpha
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: rook-ceph-block-mirrored
  resources:
    requests:
      storage: 20Gi
```

```yaml
# In namespace: team-beta
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: beta-data
  namespace: team-beta
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: rook-ceph-block-mirrored
  resources:
    requests:
      storage: 10Gi
```

## Verifying Mirror Status Across Namespaces

Check that images created for both namespaces are being mirrored:

```bash
# List all PVs using the mirrored StorageClass
kubectl get pv | grep rook-ceph-block-mirrored

# Extract the RBD image names from PV specs
kubectl get pv <pv-name> -o jsonpath='{.spec.csi.volumeAttributes.imageName}'

# Check mirror status for each image
rbd mirror image status mirrored-pool/<image-name>
```

## RBAC for Multi-Namespace CSI Access

Ensure the Rook CSI service account has access to read node stage secrets:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: rook-csi-nodeplugin-cross-ns
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: rook-csi-nodeplugin
subjects:
  - kind: ServiceAccount
    name: rook-csi-rbd-plugin-sa
    namespace: rook-ceph
```

## Summary

Cross-namespace RBD mirroring in Rook is achieved by using cluster-scoped StorageClasses that reference a mirrored CephBlockPool. Any namespace can provision PVCs from the mirrored pool, and the CSI driver manages authentication via secrets in the rook-ceph namespace. Verify that all provisioned images show up in `rbd mirror image status` checks.
