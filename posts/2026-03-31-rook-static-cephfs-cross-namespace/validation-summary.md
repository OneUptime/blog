# Validation Summary: How to Set Up Static CephFS Volumes for Cross-Namespace Sharing in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Ceph CSI driver

## Sources Consulted
- Rook official documentation on CephFS static PVs: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/#static-provisioning
- Kubernetes documentation on PersistentVolumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Ceph CSI documentation on static PVs: https://github.com/ceph/ceph-csi/blob/devel/docs/static-pvc.md
- Ceph documentation on CephFS subvolumes: https://docs.ceph.com/en/latest/cephfs/fs-volumes/

## Issues Found

1. **Critical: PV-to-PVC 1:1 binding misrepresented.** The original post showed a single PV (`cephfs-shared-pv`) and claimed two PVCs from different namespaces could bind to it. In Kubernetes, a PV can only bind to one PVC at a time. Fixed by showing two separate PVs (one per namespace), each with a unique name and `volumeHandle`, but both pointing to the same CephFS `rootPath`. This is the correct pattern for cross-namespace sharing with static CephFS volumes.

2. **Minor: Unnecessary `mkdir` command in toolbox section.** The original post included `mkdir -p /mnt/cephfs/shared-data` inside the toolbox, but this path was never referenced again. The subvolume commands that follow are the correct way to create the shared directory. Removed the unused `mkdir` command to avoid confusion.

3. **Minor: `controllerExpandSecretRef` not needed for static volumes.** The original PV spec included `controllerExpandSecretRef`, which is used for dynamic volume expansion. For static volumes this is unnecessary. Removed from the corrected PV definitions to keep the example minimal and accurate.

## Review Notes
- The `ceph fs subvolumegroup create` and `ceph fs subvolume create` commands are correct and current.
- The CSI driver name `rook-ceph.cephfs.csi.ceph.com` is the correct default for Rook CephFS deployments.
- The secret name `rook-csi-cephfs-node` for `nodeStageSecretRef` is the correct default Rook-created secret.
- The advice about `Retain` reclaim policy and `staticVolume: "true"` is accurate and important.
- The configmap command for retrieving cluster ID is correct.
