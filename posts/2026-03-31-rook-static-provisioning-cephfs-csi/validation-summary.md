# Validation Summary: How to Configure Static Provisioning for CephFS in Rook CSI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph CSI driver (CephFS)
- CephFS (Ceph distributed filesystem)
- Kubernetes PersistentVolume / PersistentVolumeClaim
- Kubernetes CSI (Container Storage Interface)

## Sources Consulted
- Rook official documentation on CephFS filesystem storage (https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/)
- Ceph CSI upstream static PV documentation (https://github.com/ceph/ceph-csi/blob/devel/docs/static-pvc.md)
- Rook CephFS static provisioning examples in the Rook repository
- Ceph documentation on `ceph fs subvolumegroup` commands

## Issues Found
- **Incorrect CSI driver name**: The post used `cephfs.csi.ceph.com` as the CSI driver name. In a Rook deployment, the operator prepends the namespace to the driver name, making the correct default `rook-ceph.cephfs.csi.ceph.com`. The upstream name `cephfs.csi.ceph.com` is only correct for standalone ceph-csi deployments without Rook. Fixed to `rook-ceph.cephfs.csi.ceph.com`.

## Review Notes
- The `ceph fs subvolumegroup ls` section is tangential — it lists subvolume groups but is not strictly necessary for static provisioning of a plain CephFS directory path. It could be more useful if it showed how to find existing subvolume paths. However, it is not technically incorrect, so no change was made.
- The post does not include `controllerExpandSecretRef`, which is fine since static PVs do not support resize operations.
- The `storageClassName: rook-cephfs` on both the PV and PVC works for binding but an alternative approach is to use `storageClassName: ""` on the PVC to avoid any interaction with a dynamic provisioner. Both approaches are valid.
