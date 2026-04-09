# Validation Summary: How to Enable Encryption at Rest for Rook-Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph BlueStore with dmcrypt/LUKS encryption
- Kubernetes (CephCluster CRD, StorageClass)
- HashiCorp Vault (KMS integration)
- Ceph CSI RBD driver (per-volume encryption)

## Sources Consulted
- Rook Key Management System documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph CSI Drivers documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook GitHub documentation source: https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/Advanced/key-management-system.md
- Ceph encryption documentation: https://docs.ceph.com/en/latest/ceph-volume/lvm/encryption/

## Issues Found
1. **Incorrect OSD metadata field names in verification section**: The post instructed readers to look for `bluefs_encryption_enabled: 1` and `osd_objectstore_type: bluestore` in the output of `ceph osd metadata 0 | grep encryption`. The field name `bluefs_encryption_enabled` is not a documented Ceph OSD metadata field and could not be verified in official Ceph documentation. Additionally, `osd_objectstore_type` is not the correct field name (the actual field is `osd_objectstore`), and it would not appear in output filtered by `grep encryption` anyway. Changed the grep flag to `-i` for case-insensitive matching and replaced the specific field name claims with a general instruction to look for encryption-related fields, plus a separate command to verify BlueStore usage via the correct `osd_objectstore` field.

## Review Notes
- The `VAULT_BACKEND_PATH: rook/osd-keys` value is a valid but non-standard path. Official Rook documentation examples typically use simpler paths like `rook`. The path `rook/osd-keys` works if the Vault secrets engine is mounted at that path, but readers should ensure their Vault setup matches.
- The Vault policy uses `path "rook/osd-keys/*"` which is correct for KV v1. If using KV v2, the policy path would need to be `rook/osd-keys/data/*` to allow access to secret data. The blog post does not specify the KV engine version.
- The `tokenSecretName: rook-vault-kms-token` is included alongside `VAULT_AUTH_METHOD: kubernetes`. When using Kubernetes auth, the token secret is not used for authentication (the Kubernetes service account is used instead). This field may still be required in the CRD structure depending on the Rook version, but could be confusing to readers implementing Kubernetes auth for the first time.
- The post correctly covers both OSD-level encryption (dmcrypt via `encrypted: true` in storageClassDeviceSets) and per-volume RBD encryption (via StorageClass parameters), which are two distinct encryption mechanisms.
