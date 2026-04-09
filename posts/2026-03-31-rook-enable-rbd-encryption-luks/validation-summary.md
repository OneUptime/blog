# Validation Summary: How to Enable RBD Encryption (LUKS)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (block storage orchestration on Kubernetes)
- Ceph RBD (RADOS Block Device)
- ceph-csi (CSI driver for Ceph)
- LUKS (Linux Unified Key Setup) encryption
- Kubernetes StorageClass, PVC, Secrets, ConfigMap
- HashiCorp Vault (optional KMS integration)

## Sources Consulted
- Rook block storage documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- ceph-csi encryption documentation: https://github.com/ceph/ceph-csi/blob/devel/docs/encryption.md
- ceph-csi RBD deployment documentation: https://github.com/ceph/ceph-csi/blob/devel/docs/deploy-rbd.md
- ceph-csi source code for KMS types: `internal/kms/kms.go`, `internal/kms/secretskms.go`, `internal/kms/vault.go`
- Kubernetes CSI spec for StorageClass secret parameters: https://kubernetes-csi.github.io/docs/secrets-and-credentials-storage-class.html
- ceph-csi example KMS ConfigMap: `examples/kms/vault/csi-kms-connection-details.yaml`

## Issues Found

### Issue 1: Invalid CSI parameter `csi.storage.k8s.io/node-stage-secret-annotations`
- **What was wrong:** The StorageClass in Step 2 used a parameter `csi.storage.k8s.io/node-stage-secret-annotations` to reference the encryption passphrase secret. This parameter does not exist in the Kubernetes CSI specification. The CSI spec only defines `-name` and `-namespace` suffixed parameters (e.g., `node-stage-secret-name`, `node-stage-secret-namespace`).
- **What was changed:** Removed the invalid `csi.storage.k8s.io/node-stage-secret-annotations` parameter entirely.
- **Why:** This parameter would be silently ignored by the CSI driver, meaning encryption would not be properly configured.

### Issue 2: `encryptionKMSID: ""` triggers test dummy KMS
- **What was wrong:** Setting `encryptionKMSID` to an empty string `""` in the StorageClass causes ceph-csi to resolve to a `DefaultKMSType` which maps to a test dummy KMS with a hardcoded passphrase. This is internal testing infrastructure, not a production-ready mechanism.
- **What was changed:** Replaced `encryptionKMSID: ""` with `encryptionKMSID: kubernetes-secret-encryption` referencing a properly configured KMS entry in the `csi-kms-connection-details` ConfigMap.
- **Why:** Without a valid KMS configuration, encryption key management would either fail or use an insecure test fallback.

### Issue 3: Missing KMS ConfigMap for Kubernetes secrets-based encryption
- **What was wrong:** Step 1 only created a standalone Kubernetes secret with the encryption passphrase but did not configure the CSI driver to use it. The ceph-csi driver requires a `csi-kms-connection-details` ConfigMap entry of type `"metadata"` to know how to retrieve encryption keys.
- **What was changed:** Added a `csi-kms-connection-details` ConfigMap definition in Step 1 with a `"metadata"` type entry that references the encryption secret by name.
- **Why:** Without the ConfigMap, the CSI driver has no way to locate the encryption passphrase secret.

### Issue 4: Wrong KMS type field name `KMSTypeName`
- **What was wrong:** The Vault KMS configuration in Step 3 used `"KMSTypeName": "vault"` as the field name for specifying the KMS provider type. This field name does not exist in ceph-csi.
- **What was changed:** Replaced `"KMSTypeName"` with `"encryptionKMSType"` which is the correct field name used by ceph-csi for Vault with Kubernetes auth.
- **Why:** Using the wrong field name would cause ceph-csi to fail to identify the KMS provider, resulting in encryption configuration errors.

## Review Notes
- The remaining Vault configuration fields (`vaultAddress`, `vaultAuthPath`, `vaultRole`, `vaultPassphraseRoot`, `vaultPassphrasePath`, `vaultCAVerify`) are all valid ceph-csi Vault configuration parameters.
- The `metadata` KMS type stores encryption passphrases as Kubernetes secrets. For environments with strict security requirements, the Vault KMS integration (Step 3) is recommended as it provides better key isolation and audit logging.
- The verification commands in Step 5 (`lsblk` and `dmsetup info`) are correct for confirming LUKS/dm-crypt is active on the encrypted volume.
- The PVC definition in Step 4 is correct and standard.
- The general explanation of how RBD encryption works (data encrypted at the host before writing to Ceph, transparent to applications) is accurate.
