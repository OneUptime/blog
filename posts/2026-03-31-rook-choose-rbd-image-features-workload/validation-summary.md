# Validation Summary: How to Choose RBD Image Features for Your Workload

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- RBD image features (layering, exclusive-lock, object-map, fast-diff, deep-flatten, journaling, data-pool)
- Kubernetes CSI (Container Storage Interface)
- Linux kernel RBD driver

## Sources Consulted
- Ceph official documentation on RBD image features and bitmask values (https://docs.ceph.com/en/latest/rbd/rbd-config-ref/)
- Ceph RBD CLI reference for `rbd create`, `rbd feature enable/disable`, `rbd info` (https://docs.ceph.com/en/latest/man/8/rbd/)
- Linux kernel source for RBD bus registration and sysfs attributes (`drivers/block/rbd.c`)
- Rook documentation on CephBlockPool and StorageClass imageFeatures (https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/)
- Ceph documentation on RBD mirroring and journaling requirements (https://docs.ceph.com/en/latest/rbd/rbd-mirroring/)

## Issues Found
1. **Incorrect sysfs path for kernel RBD supported features.**
   - **What was wrong:** The post listed the path as `/sys/bus/platform/drivers/rbd/supported_features`.
   - **What was changed:** Corrected to `/sys/bus/rbd/supported_features`.
   - **Why:** The RBD kernel module registers as its own bus type (`/sys/bus/rbd/`), not as a platform driver. The `supported_features` attribute is exposed as a bus-level attribute at `/sys/bus/rbd/supported_features`.

## Review Notes
- The feature bitmask value 61 is correctly calculated: layering (1) + exclusive-lock (4) + object-map (8) + fast-diff (16) + deep-flatten (32) = 61.
- Feature dependency chains are correctly respected in all examples: `fast-diff` requires `object-map`, which requires `exclusive-lock` -- all examples that use fast-diff include both prerequisites.
- The post correctly notes that journaling is required for journal-based RBD mirroring. Snapshot-based mirroring (available since Ceph Nautilus) does not require journaling, and the post correctly qualifies this as "journal-based mode."
- The `rbd create` command syntax with `--image-feature` flag and comma-separated feature list is correct.
- The `rbd feature enable` and `rbd feature disable` commands are syntactically correct.
- The `ceph config set client rbd_default_features` command is the correct way to set global defaults.
