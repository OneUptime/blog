# Validation Summary: How to Deploy Rook-Ceph Shared Filesystem with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Flux CD Kustomization and HelmRelease resources
- Rook-Ceph
- CephFS
- Ceph CSI
- Kubernetes StorageClass and PersistentVolumeClaim resources
- Zero to JupyterHub with Kubernetes

## Sources Consulted
- Rook Ceph shared filesystem storage documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook Ceph CRD specification: https://rook.io/docs/rook/latest/CRDs/specification/
- Rook Ceph CSI driver documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- CephFS quota documentation: https://docs.ceph.com/en/latest/cephfs/quota/
- CephFS volumes and subvolumes documentation: https://docs.ceph.com/en/latest/cephfs/fs-volumes/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Zero to JupyterHub configuration reference: https://z2jh.jupyter.org/en/latest/resources/reference.html
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolume documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
- The introduction described CephFS as backed by "Ceph's object storage." I changed this to "Ceph's RADOS object store" for technical precision.
- The StorageClass omitted the `controller-publish` CephFS CSI secret parameters present in Rook's official CephFS StorageClass example. I added `csi.storage.k8s.io/controller-publish-secret-name` and `csi.storage.k8s.io/controller-publish-secret-namespace`.
- The JupyterHub example placed `capacity` under `singleuser.storage.dynamic`, but the chart defines it as `singleuser.storage.capacity`. I moved `capacity` to the correct level.
- The JupyterHub example claimed RWX home directories but did not set `singleuser.storage.dynamic.storageAccessModes`; the chart default is `ReadWriteOnce`. I added `ReadWriteMany`.
- The CephFS quota example used an invalid `ceph fs subvolume setattr ... max_bytes` command and implied a standalone Ceph image CronJob could set per-PVC quotas. I replaced it with the Rook-documented behavior that CephFS CSI enforces requested PVC size using quotas and showed resizing through the PVC storage request when `allowVolumeExpansion` is enabled.

## Review Notes
- The remaining Rook `CephFilesystem`, CephFS StorageClass, RWX PVC, Flux Kustomization, and `kubectl exec` verification examples align with current official documentation.
- The `debug` mount option is acceptable as a temporary testing option, and the post already tells readers to remove it before production.
