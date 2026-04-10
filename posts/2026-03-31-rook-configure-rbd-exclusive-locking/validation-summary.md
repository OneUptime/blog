# Validation Summary: How to Configure RBD Exclusive Locking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- Rook-Ceph operator for Kubernetes
- Kubernetes StorageClass configuration
- RBD exclusive locking feature
- kubectl CLI

## Sources Consulted
- Ceph RBD Exclusive Locks documentation: https://docs.ceph.com/en/reef/rbd/rbd-exclusive-locks/
- Ceph RBD Config Reference: https://docs.ceph.com/en/latest/rbd/rbd-config-ref/
- Ceph rbd man page: https://docs.ceph.com/en/reef/man/8/rbd/
- Rook Block Storage (RBD) documentation: https://rook.io/docs/rook/v1.14/Storage-Configuration/Block-Storage-RBD/block-storage/
- ceph-csi StorageClass examples: https://github.com/ceph/ceph-csi/blob/devel/examples/rbd/storageclass.yaml
- Ceph RBD and Kubernetes documentation: https://docs.ceph.com/en/latest/rbd/rbd-kubernetes/

## Issues Found

### 1. Misleading section title and description for StorageClass configuration
- **What was wrong:** The section was titled "Configuring Lock Timeout in the StorageClass" and the introductory text said "Set the lock-on-read and timeout options:" — but the YAML example contained neither lock-on-read nor lock-timeout parameters. It only showed standard `imageFeatures` configuration. There is no standard lock-timeout StorageClass parameter; `lock_on_read` is a kernel map option configured via `mapOptions`, not `imageFeatures`.
- **What was changed:** Renamed the section to "Configuring Exclusive Lock in the StorageClass" and changed the introductory text to "Include `exclusive-lock` in the `imageFeatures` parameter:" to accurately describe the YAML shown.
- **Why:** The original title and description promised content the example did not deliver, which would confuse readers looking for actual lock timeout configuration.

### 2. Oversimplified RWX incompatibility claim
- **What was wrong:** The post stated "RBD exclusive locking is incompatible with `ReadWriteMany` access mode" and "Attempting to mount an RBD PVC as `ReadWriteMany` will fail if exclusive-lock is enabled." This is only true for filesystem volume mode. RBD with raw block volume mode (`volumeMode: Block`) does support RWX via ceph-csi.
- **What was changed:** Qualified the statement to specify that the incompatibility applies to filesystem volume mode, and noted that raw block volume mode supports RWX when the application handles concurrent access.
- **Why:** The original blanket statement was technically inaccurate and could mislead users who need RWX with raw block devices.

## Review Notes
- All CLI commands (`rbd lock ls`, `rbd lock rm`, `rbd feature enable`, `rbd info`) use correct syntax and argument ordering per the official rbd man page.
- The default features claim (exclusive-lock enabled by default on format 2 images) is correct — `rbd_default_features` = 61 includes exclusive-lock.
- The feature dependency chain (object-map and fast-diff depend on exclusive-lock) is accurately described.
- The StorageClass YAML is valid and follows current Rook-Ceph conventions with correct provisioner name and secret references.
- The sample `rbd lock ls` output format is consistent with actual Ceph output.
