# Validation Summary: How to Set Up Erasure Coded Block Storage with Kernel 4.11+ in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Erasure Coding (EC) for RBD block storage
- Kubernetes StorageClass, PVC, CephBlockPool CRDs
- Linux kernel RBD (krbd) driver
- Rook CSI RBD provisioner

## Sources Consulted
- Rook Block Storage documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook CephBlockPool CRD specification: https://rook.github.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook EC StorageClass example: https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass-ec.yaml
- Rook CSI driver documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook source code for EC profile naming (`GetErasureCodeProfileForPool` in `pkg/daemon/ceph/client/pool.go`)
- Ceph RBD feature documentation: https://docs.ceph.com/en/reef/rbd/rbd-exclusive-locks/
- Ceph Luminous EC blog post: https://ceph.io/en/news/blog/2017/new-luminous-erasure-coding-rbd-cephfs/

## Issues Found

1. **Incorrect explanation of kernel 4.11 requirement (Overview and Summary)**: The post claimed EC overwrites require `RBD_FEATURE_OBJECT_MAP` and `RBD_FEATURE_DEEP_FLATTEN` features that depend on newer kernel modules. This is incorrect. The actual reason kernel 4.11+ is required is that the krbd (kernel RBD) driver gained `data-pool` support in that version, which is necessary for EC RBD's two-pool architecture (replicated metadata pool + EC data pool). Fixed in both the Overview and Summary sections.

2. **Missing `exclusive-lock` in StorageClass imageFeatures**: The post listed `layering,object-map,fast-diff,deep-flatten` but omitted `exclusive-lock`, which is a required dependency for `object-map` (and transitively for `fast-diff`). Without `exclusive-lock`, these features cannot function correctly. Fixed to `layering,exclusive-lock,object-map,fast-diff,deep-flatten`.

3. **Incorrect erasure code profile name in verification command**: The post used `rook-erasure-code-profile` but Rook auto-generates EC profile names using the convention `<poolName>_ecprofile`. For the pool named `ec-data-pool`, the correct profile name is `ec-data-pool_ecprofile`. Fixed the verification command.

4. **Incorrect pool name in `rbd info` command**: The post used `rbd info replicapool/<pvc-image-name>` but the metadata pool defined in the post is named `replicated-metadata-pool`, not `replicapool`. Fixed to `rbd info replicated-metadata-pool/<pvc-image-name>`.

## Review Notes
- The official Rook EC StorageClass example uses only `imageFeatures: layering` for maximum kernel compatibility. The expanded feature set (`exclusive-lock,object-map,fast-diff,deep-flatten`) requires kernel 5.3+ when using krbd directly. Since the post uses the CSI driver (which uses librbd, not krbd), these features work regardless of kernel version via CSI. However, if a reader uses krbd directly, they would need kernel 5.3+ for the full feature set — this nuance is not mentioned in the post.
- The `kubectl debug` approach for checking kernel versions requires the `EphemeralContainers` feature gate (GA since Kubernetes 1.25). Older clusters may not support this command.
