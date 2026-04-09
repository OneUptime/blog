# Validation Summary: How to Integrate HashiCorp Vault with Rook-Ceph (Kubernetes Auth)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HashiCorp Vault (Kubernetes auth method)
- Rook-Ceph (KMS integration for OSD encryption)
- Kubernetes (service accounts, ConfigMaps)
- Ceph CSI (KMS ConfigMap for PVC encryption)

## Sources Consulted
- Vault Kubernetes Auth Method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- Vault Kubernetes Auth API reference: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- Vault KV v2 Secrets Engine: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
- Vault Policy Write command: https://developer.hashicorp.com/vault/docs/commands/policy/write
- Vault File Audit Device: https://developer.hashicorp.com/vault/docs/audit/file
- Rook KMS documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/
- Rook GitHub deploy/examples/common.yaml for service account definitions
- Ceph-CSI Vault KMS config examples: https://github.com/ceph/ceph-csi/blob/devel/examples/kms/vault/kms-config.yaml
- kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/

## Issues Found
1. **Incorrect service account names in Vault role binding (line 48)**: The blog used `rook-ceph-operator,rook-ceph-default` as the `bound_service_account_names`. The official Rook KMS documentation specifies `rook-ceph-system,rook-ceph-osd`. The `rook-ceph-operator` service account does not exist in Rook's `common.yaml` deployment manifest. Fixed to `rook-ceph-system,rook-ceph-osd`.

2. **Incorrect service account name in troubleshooting section (lines 119, 122)**: The troubleshooting commands referenced `rook-ceph-operator` for verifying and creating tokens. Updated both to `rook-ceph-system` to match the corrected Vault role binding and actual Rook service account names.

## Review Notes
- The `issuer` parameter in `vault write auth/kubernetes/config` (Step 1) is deprecated since Vault 1.9+. The recommended approach is to use `disable_iss_validation=true` instead. The parameter still functions but may be removed in a future Vault release.
- The `policies` and `ttl` parameters in the Vault role creation (Step 2) are deprecated in favor of `token_policies` and `token_ttl` respectively. They still work but the newer parameter names are preferred.
- The `vault kv list secret/rook-ceph/` command (Step 5) works but the recommended syntax since Vault 1.11+ is `vault kv list -mount=secret rook-ceph/`.
- The CSI KMS ConfigMap (Step 3) uses `encryptionKMSType: "vault"` with fields like `vaultAuthPath` and `vaultRole` that are typically associated with the `vaulttenantsa` KMS type in ceph-csi. Depending on the ceph-csi version, the `encryptionKMSType` may need to be set to `vaulttenantsa` for Kubernetes service account authentication to work at the CSI level. Users should verify against their ceph-csi version's documentation.
- The CephCluster spec (Step 4) omits `VAULT_SECRET_ENGINE: kv` which, while not strictly required per the Rook docs Kubernetes auth example, could be added for explicitness.
