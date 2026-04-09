# Validation Summary: How to Manage Token Secrets for KMS in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (CephCluster CR, OSD encryption)
- Kubernetes (Secrets, kubectl CLI)
- HashiCorp Vault (KV secrets engine, token auth, Kubernetes auth method)
- Key Management Service (KMS) integration for at-rest encryption

## Sources Consulted
- Rook official documentation on KMS/Vault integration: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/
- HashiCorp Vault documentation on Kubernetes auth method: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- Kubernetes documentation on Secrets: https://kubernetes.io/docs/concepts/configuration/secret/
- Cross-referenced against 15+ validated Rook KMS blog posts in this repository for CephCluster CR field accuracy (`spec.security.kms.enable`, `connectionDetails`, `tokenSecretName`, `VAULT_SECRET_ENGINE`, `VAULT_AUTH_METHOD`)

## Issues Found
No technical issues found.

## Review Notes
- The CephCluster CR YAML uses `enable: true` (not `enabled`), which is the correct field name per the Rook CRD. Confirmed consistent across all validated posts in the repository.
- The `connectionDetails` map includes all required fields: `KMS_PROVIDER: vault`, `VAULT_ADDR`, `VAULT_BACKEND_PATH`, `VAULT_SECRET_ENGINE: kv`, and `VAULT_AUTH_METHOD: token`. This is the correct and complete set for token-based Vault auth.
- The `tokenSecretName` field is correctly placed at `spec.security.kms.tokenSecretName`.
- The `kubectl patch secret` command correctly uses `stringData` (not `data`) to avoid manual base64 encoding, which is the recommended approach.
- The Vault Kubernetes auth section correctly notes that `tokenSecretName` should be removed when switching to Kubernetes auth, since these are mutually exclusive authentication methods.
- The `bound_service_account_names=rook-ceph-osd` in the Vault role configuration is reasonable for OSD pods that need to fetch encryption keys, though in some Rook deployments the operator service account may also need access depending on the version.
- The post does not mention that the Vault Kubernetes auth configuration command (`vault write auth/kubernetes/config`) typically needs to be run from within a pod in the cluster or with a service account token that has `system:auth-delegator` permissions. This is a minor omission of context, not an error.
