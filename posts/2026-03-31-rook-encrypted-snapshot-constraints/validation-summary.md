# Validation Summary: How to Handle Encrypted Snapshot Constraints in Rook CSI

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- Kubernetes CSI (Container Storage Interface)
- LUKS encryption via Rook CSI
- Kubernetes VolumeSnapshot API
- KMS (Key Management Service) integration with Rook

## Sources Consulted
- Rook official documentation — Block Storage RBD snapshots: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/rbd-snapshot/
- Rook official documentation — Block Storage encryption: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/#encryption
- Rook official documentation — PVC clone/restore: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/pvc-clone/
- Rook GitHub — VolumeSnapshotClass example (`snapshotclass.yaml`)
- Rook GitHub — CSI RBD provisioner deployment template (`pkg/operator/ceph/csi/template/rbd/csi-rbdplugin-provisioner-dep.yaml`)
- Kubernetes CSI documentation — secrets and credentials for VolumeSnapshotClass
- Ceph documentation — `rbd snap ls` command syntax

## Issues Found

### Issue 1: Misleading "same key" language in Constraint 1
- **What was wrong:** The post stated that snapshots "are themselves encrypted with the same key as the source volume," which oversimplifies the mechanism. Rook CSI encryption uses LUKS with passphrases retrieved from a KMS. The snapshot does not literally carry the key; rather, the restored volume must use the same KMS configuration so the correct passphrase can be retrieved.
- **What was changed:** Rephrased to say snapshots "can only be restored to encrypted PVCs using the same KMS configuration" and clarified that the encrypted StorageClass must reference the same KMS backend for passphrase retrieval.
- **Why:** Accuracy — the distinction between "same key inheritance" and "same KMS configuration for passphrase retrieval" matters for understanding the actual mechanism and debugging failures.

### Issue 2: Incorrect framing of VolumeSnapshotClass parameters as encryption-specific
- **What was wrong:** Constraint 3 was titled "VolumeSnapshotClass Must Support Encryption" and described the `snapshotter-secret-name` and `snapshotter-secret-namespace` parameters as "KMS secrets reference." These parameters are actually standard Ceph authentication secrets (containing monitor endpoints and admin keys) required for ALL RBD snapshot operations, not just encrypted ones. The VolumeSnapshotClass name was also misleadingly suffixed with `-encrypted`.
- **What was changed:** Retitled to "VolumeSnapshotClass Must Be Properly Configured," clarified that these are standard Ceph authentication parameters needed for all RBD snapshots, and renamed the example VolumeSnapshotClass to `csi-rbdplugin-snapclass` (without `-encrypted` suffix) to avoid implying it is encryption-specific.
- **Why:** The original framing could lead readers to believe they need a separate VolumeSnapshotClass for encrypted volumes or that these parameters enable encryption, which is incorrect.

## Review Notes
- **Constraint 4 (Volume Group Snapshots and Encryption):** The claim that all volumes in a group snapshot must share the same KMS configuration is a reasonable inference but is not explicitly documented in official Rook documentation. The volume group snapshot docs make no reference to encryption constraints. This is not necessarily wrong, but readers should be aware it is not an officially documented constraint.
- **Error message strings:** The three error messages listed in the debugging section ("failed to get encryption passphrase", "rbd: snap create failed", "missing KMS configuration") could not be verified against official documentation. They appear plausible but may not be exact strings from ceph-csi logs.
- **Cross-KMS restore constraint (Constraint 2):** This is a logical inference from how Rook CSI encryption works (passphrase tied to KMS configuration in StorageClass) but is not explicitly stated in official documentation. The claim is reasonable but unconfirmed as an official constraint.
- All YAML syntax, API versions, CLI commands, parameter keys, and `rbd` command syntax were verified as correct.
