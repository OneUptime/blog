# Validation Summary: How to Set Up Encryption Key Rotation with Rook CSI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph storage orchestrator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- CSI (Container Storage Interface)
- CSI-Addons (kubernetes-csi-addons)
- LUKS (Linux Unified Key Setup) encryption
- cryptsetup
- HashiCorp Vault (as KMS example)
- Kubernetes StorageClass, PVC

## Sources Consulted
- CSI-Addons encryption key rotation documentation: https://github.com/csi-addons/kubernetes-csi-addons/blob/v0.12.0/docs/encryptionkeyrotation.md
- CSI-Addons v1alpha1 API reference: https://pkg.go.dev/github.com/csi-addons/kubernetes-csi-addons/api/csiaddons/v1alpha1
- Rook Ceph CSI Drivers documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Ceph-CSI encryption key rotation design: https://hackmd.io/@rakshith-r/S18NJjPEo
- cryptsetup man pages (luksChangeKey, luksAddKey, luksKillSlot): https://man7.org/linux/man-pages/man8/cryptsetup-luksChangeKey.8.html

## Issues Found
1. **Incorrect cryptsetup command for key rotation**: The post stated that key rotation uses `cryptsetup luksChangeKey`. The actual Ceph-CSI implementation uses a safer two-step approach: `cryptsetup luksAddKey` to add the new key to a free LUKS slot, followed by `cryptsetup luksKillSlot` to remove the old key. This ensures overlapping key availability and reduces the risk of data loss if the operation is interrupted mid-rotation. Fixed step 2 in the "How Key Rotation Works" section.

2. **Misleading KMS key deactivation claim**: The post stated "The old key is deactivated in the KMS." The documented rotation process updates the KMS with the new key reference rather than explicitly "deactivating" the old key. Changed to "The KMS is updated with the new key reference" for accuracy.

## Review Notes
- The CSI-Addons CRD API group (`csiaddons.openshift.io/v1alpha1`), resource kinds (`EncryptionKeyRotationJob`, `EncryptionKeyRotationCronJob`), and all spec fields were verified as correct against official documentation.
- The StorageClass encryption parameters (`encrypted: "true"`, `encryptionKMSID`) are correct per Rook documentation.
- The EncryptionKeyRotationJob also supports an optional `spec.timeout` field for gRPC request timeout (defaults to 3 minutes), and the EncryptionKeyRotationCronJob supports an optional `spec.concurrencyPolicy` field — these are not mentioned in the post but are not required for a basic tutorial.
- The claim that key rotation is non-disruptive and can be performed while the volume is mounted is correct per official documentation.
