# Validation Summary: How to Enable Image Features for RBD Volumes in Rook

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- Kubernetes StorageClass
- Ceph CSI (Container Storage Interface) driver
- Linux kernel RBD (krbd) client

## Sources Consulted
- Ceph RBD man page (rbd.rst): https://github.com/ceph/ceph/blob/main/doc/man/8/rbd.rst
- Ceph RBD Image Encryption docs: https://docs.ceph.com/en/latest/rbd/rbd-encryption/
- Rook Block Storage documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook example StorageClass: https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass.yaml
- Rook GitHub issue #8436 (Image Features for RBD volumes): https://github.com/rook/rook/issues/8436
- Linux kernel rbd.c source: https://github.com/torvalds/linux/blob/master/drivers/block/rbd.c
- Linux 5.3 release notes: https://kernelnewbies.org/Linux_5.3
- Ceph tracker #40802 (krbd feature support kernel releases): https://tracker.ceph.com/issues/40802

## Issues Found

1. **Encryption incorrectly listed as an RBD image feature capability**: The intro paragraph and Description metadata mentioned "encryption" as a capability enabled by RBD image features. Encryption is NOT an RBD image feature — it is handled at the CSI driver level via LUKS (LUKS1/LUKS2). Removed "encryption" from both the description and intro paragraph.

2. **Kernel compatibility table was incorrect for `object-map` and `fast-diff`**: The table stated these features are "Not supported in kernel client," which is outdated. Both `object-map` and `fast-diff` have been supported by the Linux kernel RBD (krbd) client since kernel 5.3 (merged July 2019). Updated the table with correct minimum kernel versions.

3. **`deep-flatten` was missing from the kernel compatibility table**: `deep-flatten` has been supported by the krbd client since kernel 5.1 but was omitted from the table entirely. Added it with the correct minimum kernel version.

4. **Kernel client recommendation was overly conservative**: The original advice to "limit features to `layering` only" when targeting kernel clients is only necessary for very old kernels (< 5.3). Added a recommendation to use the full feature set (`layering,exclusive-lock,object-map,fast-diff,deep-flatten`) for kernel 5.4+, while keeping the conservative `layering`-only advice for older kernels.

5. **Incomplete feature dependency documentation**: The post only documented that `journaling` requires `exclusive-lock`. Added the full dependency chain: `object-map` requires `exclusive-lock`, and `fast-diff` requires `object-map`.

## Review Notes
- The StorageClass YAML examples are correct: provisioner name (`rook-ceph.rbd.csi.ceph.com`), secret names (`rook-csi-rbd-provisioner`, `rook-csi-rbd-node`), and parameter structure all match the official Rook examples.
- The `rbd feature enable/disable` commands are syntactically correct and use the proper image path format.
- Rook's default example StorageClass does use `imageFeatures: layering` as the active (uncommented) default, but includes a commented-out line with the expanded feature set for kernels 5.4+. The post could mention this nuance in a future update.
- The mirroring StorageClass correctly uses `reclaimPolicy: Retain`, which is appropriate for mirrored volumes.
