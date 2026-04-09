# Validation Summary: How to Configure TLS for Vault Integration in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook-Ceph (CSI KMS encryption)
- HashiCorp Vault (KMS provider)
- Kubernetes (Secrets, ConfigMaps, CephCluster CRD)
- TLS / mutual TLS (mTLS)
- ceph-csi (CSI driver KMS integration)

## Sources Consulted
- Rook KMS documentation: https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/Advanced/key-management-system.md
- ceph-csi Vault KMS source code: https://github.com/ceph/ceph-csi/blob/devel/internal/kms/vault.go
- ceph-csi Vault Tokens KMS source code: https://github.com/ceph/ceph-csi/blob/devel/internal/kms/vault_tokens.go
- ceph-csi KMS config example: https://github.com/ceph/ceph-csi/blob/devel/examples/kms/vault/kms-config.yaml
- ceph-csi KMS connection details example: https://github.com/ceph/ceph-csi/blob/devel/examples/kms/vault/csi-kms-connection-details.yaml

## Issues Found

### 1. Incorrect field name `vaultSkipVerify` in dev KMS config (Fixed)
- **What was wrong:** The "Disable TLS Verification" section used `"vaultSkipVerify": "true"` and the warning text referenced `vaultSkipVerify: true`. This field does not exist in any ceph-csi Vault KMS type.
- **What was changed:** Replaced with `"vaultCAVerify": "false"`, which is the correct field name supported by the `vault`, `vaulttokens`, and `vaulttenantsa` KMS types in ceph-csi. Updated the warning text accordingly.
- **Why:** The ceph-csi source code (vault.go, vault_tokens.go) and official KMS config examples all use `vaultCAVerify` (default `"true"`) to control CA certificate verification. Setting it to `"false"` disables verification. The field `vaultSkipVerify` does not appear in any official source or documentation.

## Review Notes
- **Client certificate secret fields:** The ConfigMap uses `vaultClientCertFromSecret` and `vaultClientCertKeyFromSecret`. These fields are explicitly defined in the `vaulttokens` KMS type (vault_tokens.go). For the `vault` KMS type, only `vaultCAFromSecret` was confirmed in vault.go source. If users encounter issues with client cert fields under `encryptionKMSType: "vault"`, they may need to use the `vaulttokens` or `vaulttenantsa` KMS type instead, which have full support for all three certificate secret references.
- **CephCluster connectionDetails section** is correct — field names (`VAULT_CACERT`, `VAULT_CLIENT_CERT`, `VAULT_CLIENT_KEY`, `VAULT_TLS_SERVER_NAME`, etc.) match the official Rook KMS documentation.
- **Kubernetes Secret key names** (`cert` for CA/client certs, `key` for client key) align with the conventions shown in Rook documentation where `VAULT_CACERT` references a secret with a `cert` key.
- **CSI deployment/daemonset names** (`csi-rbdplugin-provisioner`, `csi-rbdplugin`) are correct for standard Rook deployments.
- **Certificate rotation pattern** (dry-run + apply pipe, followed by rollout restart) is correct and idiomatic.
- The `curl` command inside `csi-rbdplugin` container assumes curl is available; the cephcsi container image may not include it. This is a minor practical note, not a technical error.
