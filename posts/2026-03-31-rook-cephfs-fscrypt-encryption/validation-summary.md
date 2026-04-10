# Validation Summary: How to Configure CephFS fscrypt Encryption with Rook CSI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph / CephFS (distributed filesystem)
- fscrypt (Linux kernel filesystem-level encryption)
- Kubernetes StorageClasses, PVCs, and CSI drivers
- Ceph CSI KMS (Key Management Service) integration

## Sources Consulted
- Rook documentation for CephFS CSI drivers: https://rook.io/docs/rook/v1.15/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Ceph official fscrypt documentation: https://docs.ceph.com/en/latest/cephfs/fscrypt/
- Linux kernel fscrypt documentation: https://docs.kernel.org/filesystems/fscrypt.html
- Ceph CSI source code (KMS implementation): https://github.com/ceph/ceph-csi/blob/devel/internal/kms/secretskms.go
- Ceph CSI example StorageClass: https://github.com/ceph/ceph-csi/blob/devel/examples/cephfs/storageclass.yaml
- Rook PR #14199 (CephFS encryption support): https://github.com/rook/rook/pull/14199
- Phoronix coverage of CephFS fscrypt in kernel 6.6: https://www.phoronix.com/news/Linux-6.6-CephFS-FSCRYPT
- Ceph Tracker feature #46690: https://tracker.ceph.com/issues/46690

## Issues Found

### 1. Incorrect Linux kernel version requirement
- **What was wrong:** The post stated "Linux kernel 5.4 or later" as a prerequisite. CephFS fscrypt support was actually added in Linux kernel 6.6 (merged October 2023). Kernel 5.4 introduced fscrypt v2 policies for ext4/f2fs, but CephFS specifically required 6.6.
- **What was changed:** Updated to "Linux kernel 6.6 or later on all nodes".

### 2. Incorrect Rook version requirement
- **What was wrong:** The post stated "Rook version 1.11 or later". CephFS encryption support was added via Rook PR #14199, merged July 2024, and first released in Rook v1.15.
- **What was changed:** Updated to "Rook version 1.15 or later".

### 3. Incorrect fscrypt kernel module claim and check command
- **What was wrong:** The post listed "The `fscrypt` kernel module enabled" as a prerequisite and suggested running `modinfo fscrypt` to check support. Since Linux kernel 5.1, fscrypt is a bool config option (CONFIG_FS_ENCRYPTION) compiled directly into the kernel, not a loadable module. `modinfo fscrypt` would fail on any modern kernel.
- **What was changed:** Updated the prerequisite to "`CONFIG_FS_ENCRYPTION=y` enabled in the kernel" and the check command to `grep CONFIG_FS_ENCRYPTION /boot/config-$(uname -r)`.

### 4. Incorrect `encryptionKMSType` value in KMS ConfigMap
- **What was wrong:** The post used `"encryptionKMSType": "secrets-metadata"`. The correct value as defined in the Ceph CSI source code is `"metadata"`.
- **What was changed:** Updated to `"encryptionKMSType": "metadata"`.

### 5. Incorrect explanation of where encrypted data is stored
- **What was wrong:** The post stated "The Ceph MDS will store the encrypted blobs". This is architecturally incorrect. The MDS stores filesystem metadata (including encrypted filenames and directory entries), while the OSDs store the actual encrypted file data. Neither component is aware of the encryption -- it is entirely client-side.
- **What was changed:** Replaced with an accurate description: OSDs store encrypted file data, MDS stores encrypted metadata, and neither is aware of the encryption.

## Review Notes
- The `secretName` and `secretNamespace` fields in the KMS ConfigMap configuration are valid for the `metadata` KMS type, confirmed in the Ceph CSI source code.
- The StorageClass parameters (`encrypted: "true"`, `encryptionKMSID`) are correctly named and formatted.
- The PVC and test pod examples are syntactically correct and functionally appropriate.
- The log verification command targeting the `csi-cephfsplugin` container is a reasonable approach for checking encryption status.
