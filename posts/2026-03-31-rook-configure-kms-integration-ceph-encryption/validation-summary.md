# Validation Summary: How to Configure KMS Integration for Ceph Encryption

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook Ceph Operator (KMS integration for OSD and RGW encryption)
- HashiCorp Vault (KV v2 secrets engine, Kubernetes auth method)
- Kubernetes (Secrets, ServiceAccounts, CRDs)
- Ceph BlueStore OSD encryption
- Ceph RGW Server-Side Encryption (SSE-KMS)

## Sources Consulted
- Rook official documentation: Key Management System integration (https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/)
- Rook source code: `pkg/daemon/ceph/client/vault_api.go` and `pkg/apis/ceph.rook.io/v1/types.go` for field validation
- libopenstorage/secrets Vault library: `VaultBackendKey`, `VaultBackendPathKey`, `VaultSecretEngineKey` constants
- HashiCorp Vault documentation: Kubernetes auth method (https://developer.hashicorp.com/vault/docs/auth/kubernetes)
- HashiCorp Vault documentation: KV v2 secrets engine (https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2)
- HashiCorp Vault CLI reference: `vault kv`, `vault auth enable`, `vault token create`, `vault policy write`

## Issues Found

### 1. Wrong field name: `VAULT_SECRET_PATH` (CephCluster and CephObjectStore YAML)
- **What was wrong:** Both YAML examples used `VAULT_SECRET_PATH`, which is not a recognized Rook KMS configuration key.
- **What was changed:** Replaced with `VAULT_BACKEND_PATH: rook` — the correct field name specifying the Vault secrets engine mount path.
- **Why:** Rook uses `VAULT_BACKEND_PATH` (from the libopenstorage/secrets library) to identify the mount path of the Vault secrets engine. `VAULT_SECRET_PATH` does not exist and would be silently ignored.

### 2. Wrong value for `VAULT_BACKEND` (CephCluster YAML)
- **What was wrong:** `VAULT_BACKEND: v2` — the value `v2` is not recognized by Rook.
- **What was changed:** Changed to `VAULT_BACKEND: kv-v2`.
- **Why:** Valid values are `kv` (for KV v1) or `kv-v2` (for KV v2), matching the Vault secrets engine type names. The value `v2` is not handled by the libopenstorage library.

### 3. Missing `VAULT_SECRET_ENGINE` field (both YAML examples)
- **What was wrong:** The field was entirely absent from both the CephCluster and CephObjectStore configurations.
- **What was changed:** Added `VAULT_SECRET_ENGINE: kv` to both examples.
- **Why:** Rook needs this field to determine whether to use the `kv` or `transit` secrets engine. Without it, Rook may fail to configure KMS correctly.

### 4. Fabricated key rotation annotation (Rotating Keys section)
- **What was wrong:** The post claimed OSD encryption keys could be rotated by annotating the CephCluster with `rook.io/force-delete-storage-config="true"`. This annotation does not exist in the Rook codebase and the name implies destructive storage config deletion, not key rotation.
- **What was changed:** Replaced with the correct `spec.security.keyRotation` configuration, which uses `enabled: true` and a `schedule` field (e.g., `"@weekly"`) to create a CronJob for automatic key rotation.
- **Why:** The annotation was entirely fabricated. Rook's actual key rotation mechanism is through the `keyRotation` spec field, which schedules periodic key rotation via a Kubernetes CronJob.

### 5. `tokenSecretName` set with Kubernetes auth (both YAML examples)
- **What was wrong:** Both YAML examples specified `tokenSecretName: rook-vault-token` while also using `VAULT_AUTH_METHOD: kubernetes`. The `tokenSecretName` field is only used for token-based authentication.
- **What was changed:** Removed `tokenSecretName` from both YAML examples.
- **Why:** When Kubernetes auth is configured, Rook authenticates with Vault using the pod's service account token. A static Vault token is unnecessary and including it is misleading.

### 6. Vault policy path mismatch and missing KV engine setup
- **What was wrong:** The Vault policy used `path "secret/data/rook/*"` (implying the default `secret/` KV mount), but YAML configs referenced a different path. No step existed to enable a dedicated KV secrets engine.
- **What was changed:** Added `vault secrets enable -path=rook kv-v2` to prerequisites. Updated the policy to `path "rook/data/*"` and added a `rook/metadata/*` read policy (needed for KV v2 list operations).
- **Why:** Internal consistency: the YAML uses `VAULT_BACKEND_PATH: rook`, so the KV engine must be mounted at that path, and the policy must grant access to the correct KV v2 API paths (`data/` for read/write, `metadata/` for list).

### 7. Deprecated Vault role parameters
- **What was wrong:** `policies=rook-ceph` and `ttl=1h` use deprecated parameter names.
- **What was changed:** Updated to `token_policies=rook-ceph` and `token_ttl=1h`.
- **Why:** The `policies` and `ttl` parameters are deprecated in favor of `token_policies` and `token_ttl`. While the old names still work, using current parameter names is best practice.

### 8. Vault KV CLI commands missing mount context
- **What was wrong:** `vault kv list rook/osd-keys` and `vault kv put rook/rgw-keys/mykey` relied on Vault auto-detecting the mount point from the path, which is fragile.
- **What was changed:** Updated to use the explicit `-mount=rook` flag: `vault kv list -mount=rook /` and `vault kv put -mount=rook rgw-keys/mykey`.
- **Why:** HashiCorp recommends the `-mount` flag for KV v2 commands to avoid ambiguity. The path-based mount detection is deprecated behavior.

## Review Notes
- The "Creating the Vault Token Secret" section is correctly scoped as a token-based auth alternative for testing. It is not referenced in the main YAML examples (which use Kubernetes auth), so no conflict exists.
- The blog's claim that "default BlueStore and RGW encryption stores keys in the Monitor's key-value store" is a simplification. BlueStore stores OSD encryption keys in the monitor store by default, but RGW SSE is not enabled by default. This is acceptable for a blog post introduction.
- The `VAULT_BACKEND` field (for specifying KV engine version) is functional in Rook via the libopenstorage library but is not prominently documented in official Rook docs. If omitted, Rook auto-detects the version via Vault's `sys/mounts` endpoint (which requires additional Vault permissions). Including it explicitly as the blog does is good practice.
