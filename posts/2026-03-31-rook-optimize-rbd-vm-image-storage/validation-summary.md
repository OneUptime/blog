# Validation Summary: How to Optimize RBD for VM Image Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- Rook (Ceph operator for Kubernetes)
- Kubernetes StorageClass and CSI
- CephBlockPool CRD

## Sources Consulted
- Ceph RBD Snapshots Documentation: https://docs.ceph.com/en/latest/rbd/rbd-snapshot/
- Ceph rbd Man Page: https://docs.ceph.com/en/latest/man/8/rbd/
- Ceph RBD Config Reference: https://docs.ceph.com/en/latest/rbd/rbd-config-ref/
- Ceph RBD Exclusive Locks: https://docs.ceph.com/en/reef/rbd/rbd-exclusive-locks/
- Ceph RBD Layering (Dev): https://docs.ceph.com/en/reef/dev/rbd-layering/
- Rook CephBlockPool CRD: https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook Ceph CSI Drivers: https://rook.io/docs/rook/v1.10/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Ceph Object Map Feature Blog: https://ceph.io/en/news/blog/2015/ceph-enable-the-object-map-feature/
- Ceph PR #12238 (feature dependency error reporting): https://github.com/ceph/ceph/pull/12238

## Issues Found
- **Missing `exclusive-lock` in StorageClass imageFeatures**: The original StorageClass specified `imageFeatures: layering,fast-diff,object-map` without `exclusive-lock`. The RBD feature dependency chain requires `exclusive-lock` for `object-map`, and `object-map` for `fast-diff`. Without `exclusive-lock` explicitly listed, image creation can fail depending on the ceph-csi driver version, and the Rook documentation consistently includes it. Fixed to `imageFeatures: layering,exclusive-lock,object-map,fast-diff`.

## Review Notes
- The `--object-size 8388608` syntax (raw bytes) is valid but `--object-size 8M` would be more readable. Not changed since it is technically correct.
- The RBD clone workflow (create, snapshot, protect, clone) is correct and follows the standard documented sequence.
- All four RBD cache config keys (`rbd_cache`, `rbd_cache_size`, `rbd_cache_max_dirty`, `rbd_cache_target_dirty`) are valid and the values maintain the required ordering constraint (target_dirty < max_dirty < cache_size).
- The CephBlockPool CRD structure is correct: `spec.deviceClass`, `spec.parameters.pg_num`, and `spec.parameters.compression_mode` are all valid fields.
- The default RBD secret names (`rook-csi-rbd-provisioner`, `rook-csi-rbd-node`) and provisioner name (`rook-ceph.rbd.csi.ceph.com`) are correct for the default Rook deployment.
- The `deep-flatten` feature is commonly included in Rook StorageClass examples and would be beneficial for the VM flattening use case described, but its omission is not an error.
