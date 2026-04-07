# Validation Summary: How to Handle Storage Class Changes in a Running Rook Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes StorageClass API (storage.k8s.io/v1)
- Kubernetes PersistentVolumeClaim (PVC) management
- Rook CSI RBD provisioner
- CephBlockPool CRD (ceph.rook.io/v1)

## Sources Consulted
- Rook official documentation: StorageClass configuration for Block Storage (https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/)
- Kubernetes official documentation: StorageClass (https://kubernetes.io/docs/concepts/storage/storage-classes/)
- Kubernetes official documentation: kubectl wait (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- Kubernetes API reference: Pod conditions vs Pod phases (https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-conditions)

## Issues Found

### 1. Incomplete SSD StorageClass missing required CSI secret parameters
**What was wrong:** The StorageClass `rook-ceph-block-ssd` example only included `clusterID`, `pool`, `imageFormat`, and `imageFeatures` parameters. It was missing the required CSI secret references (`provisioner-secret`, `controller-expand-secret`, `node-stage-secret`) as well as `reclaimPolicy` and `allowVolumeExpansion`. Without these, the CSI provisioner would fail to create volumes.

**What was changed:** Added the full set of CSI secret parameters (`csi.storage.k8s.io/provisioner-secret-name`, `csi.storage.k8s.io/provisioner-secret-namespace`, `csi.storage.k8s.io/controller-expand-secret-name`, `csi.storage.k8s.io/controller-expand-secret-namespace`, `csi.storage.k8s.io/node-stage-secret-name`, `csi.storage.k8s.io/node-stage-secret-namespace`) along with `reclaimPolicy: Retain` and `allowVolumeExpansion: true`.

**Why:** These parameters are required for the Rook CSI RBD provisioner to authenticate with Ceph and provision volumes. Omitting them would cause every PVC using this StorageClass to fail with provisioning errors.

### 2. Invalid `kubectl wait` condition for Pod phase
**What was wrong:** `kubectl wait --for=condition=Succeeded` is incorrect because "Succeeded" is a Pod phase, not a Pod condition. Pod conditions are: PodScheduled, Initialized, ContainersReady, and Ready. Using `--for=condition=Succeeded` would result in an error or wait indefinitely.

**What was changed:** Replaced `--for=condition=Succeeded` with `--for=jsonpath='{.status.phase}'=Succeeded`, which correctly waits for the pod's phase field to equal "Succeeded".

**Why:** The jsonpath form is the correct kubectl wait syntax for checking a Pod's phase rather than its conditions.

## Review Notes
- The post correctly notes that StorageClass objects are immutable for parameters and must be deleted/recreated. This is accurate Kubernetes behavior.
- The PVC migration approach using a data-copy pod is a well-established pattern. For production use with large datasets, `rsync` would be more robust than `cp` (handles interruptions, shows progress), but `cp -av` is adequate for the tutorial context.
- The default StorageClass annotation `storageclass.kubernetes.io/is-default-class` is correct and current.
