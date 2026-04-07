# Validation Summary: How to Configure Static Provisioning for RBD in Rook CSI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- Ceph CSI (Container Storage Interface) driver
- Kubernetes PersistentVolume / PersistentVolumeClaim

## Sources Consulted
- Rook official documentation: Static Provisioning for RBD — https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Ceph CSI documentation: Static PV provisioning — https://github.com/ceph/ceph-csi/blob/devel/docs/static-pvc.md
- Ceph documentation: `rbd create` CLI reference — https://docs.ceph.com/en/latest/man/8/rbd/
- Kubernetes documentation: PersistentVolumes — https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found

1. **Incorrect size suffix in `rbd create` command**: The command used `--size 50Gi` but the Ceph `rbd` CLI uses `G` (not `Gi`, which is a Kubernetes unit convention). Fixed to `--size 50G`.

2. **Missing `imageName` in volumeAttributes**: When using `staticVolume: "true"`, the ceph-csi driver requires an `imageName` attribute to identify which RBD image to mount. Without it, the CSI driver cannot locate the pre-existing image. Added `imageName: my-static-image` to the volumeAttributes.

3. **Incorrect CSI driver name**: The post used `rbd.csi.ceph.com`, which is the standalone ceph-csi driver name. In a Rook deployment, the driver is prefixed with the operator namespace, making it `rook-ceph.rbd.csi.ceph.com`. Fixed the driver field accordingly.

## Review Notes
- The `volumeHandle` format description (`<clusterID>-<prefix>-<pool-id>-<image-id>`) is somewhat simplified. For static volumes with `staticVolume: "true"`, the volumeHandle primarily needs to be unique — the image is identified through volumeAttributes rather than by parsing the handle. The example value works fine as a unique identifier.
- The PV uses `volumeMode: Block`, which exposes the raw block device. This is valid but requires pods to use `volumeDevices` instead of `volumeMounts`. Most tutorials use `volumeMode: Filesystem` for broader applicability, but this is not an error.
- The section on static provisioning for snapshots is brief and lacks concrete examples, but the claims made are accurate.
