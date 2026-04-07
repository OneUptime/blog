# Validation Summary: How to Integrate HashiCorp Vault with Rook-Ceph (Token Auth)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HashiCorp Vault (KV v2 secrets engine, token authentication)
- Rook-Ceph (OSD encryption, CSI volume encryption)
- Kubernetes (Secrets, ConfigMaps, StorageClasses)

## Sources Consulted
- HashiCorp Vault KV v2 secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
- HashiCorp Vault policy documentation: https://developer.hashicorp.com/vault/docs/concepts/policies
- HashiCorp Vault token create CLI reference: https://developer.hashicorp.com/vault/docs/commands/token/create
- Rook-Ceph KMS integration documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/
- Rook-Ceph CephCluster CRD reference: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/

## Issues Found
1. **Incorrect `vaultBackend` value in KMS ConfigMap (Step 3):** The `vaultBackend` field was set to `"secret"`, which is the mount path, not the backend version. This field specifies the KV secrets engine version and must be `"v1"` or `"v2"`. Since the post uses KV v2 (`vault secrets enable ... kv-v2`), this was corrected to `"v2"`.

## Review Notes
- The claim that `-ttl=0` creates a non-expiring token is context-dependent. With `vault token create`, `-ttl=0` uses the default TTL of the token auth method, which by default has no max TTL, so the resulting token effectively does not expire. However, if an administrator has configured a system-wide `max_lease_ttl`, the token will still be capped. The post's explanation is acceptable for a tutorial but readers should be aware of this nuance.
- The post covers both OSD encryption (via CephCluster `connectionDetails`) and CSI volume encryption (via the `rook-ceph-csi-kms-config` ConfigMap) but does not explicitly distinguish between the two use cases. This could be clarified in a future update.
- All Vault CLI commands, Kubernetes commands, policy syntax, and YAML configurations are otherwise correct and current.
