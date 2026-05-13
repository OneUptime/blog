# Validation Summary: How to Deploy Rook-Ceph Block Storage with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph
- Ceph RBD
- CephBlockPool
- Kubernetes StorageClass
- Kubernetes PersistentVolumeClaim
- Kubernetes VolumeSnapshot and VolumeSnapshotClass
- Flux CD Kustomization
- kubectl

## Sources Consulted
- Rook Ceph block storage documentation: https://rook.github.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook Ceph CSI drivers documentation: https://rook.github.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook Ceph snapshot documentation: https://www.rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes VolumeSnapshotClass documentation: https://v1-32.docs.kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes CSI external snapshotter documentation: https://kubernetes-csi.github.io/docs/external-snapshotter.html
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Ceph pool documentation: https://docs.ceph.com/en/latest/rados/operations/pools/

## Issues Found
- Added the VolumeSnapshot CRDs and snapshot controller as prerequisites because Rook's snapshot documentation requires them before creating VolumeSnapshotClass and VolumeSnapshot resources.
- Changed both RBD StorageClasses to use `imageFeatures: layering` for broad kernel compatibility. Rook documents the advanced `fast-diff,object-map,deep-flatten,exclusive-lock` feature set as appropriate for Linux 5.4 or later kernels, so the post now mentions that caveat in best practices.
- Added the Rook-documented `controller-publish` secret parameters and explicit `csi.storage.k8s.io/fstype: ext4` to both RBD StorageClasses.
- Removed unsupported `csi.storage.k8s.io/volumesnapshot/*` template parameters from the VolumeSnapshotClass. The CSI external snapshotter generates those metadata keys internally when configured with extra metadata; they are not valid template parameters in the class.
- Added the RBD pool parameter to the VolumeSnapshotClass so the snapshot class aligns with Rook's RBD snapshot guidance.
- Reworded the volume expansion best practice to avoid promising pod-restart-free expansion for all RBD filesystem scenarios.

## Review Notes
The Flux Kustomization, CephBlockPool examples, PVC test manifest, kubectl verification commands, StorageClass fields, reclaim policies, and Ceph compression setting are consistent with the consulted official documentation. The embedded YAML blocks were parsed successfully after the fixes.
