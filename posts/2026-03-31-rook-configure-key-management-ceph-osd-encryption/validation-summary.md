# Validation Summary: How to Configure Key Management for Ceph OSD Encryption

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph OSD encryption (dmcrypt-based)
- HashiCorp Vault (KV v2 secrets engine, Kubernetes auth method)
- Kubernetes Secrets
- Kubernetes RBAC

## Sources Consulted
- Rook CephCluster CRD source code (`pkg/apis/ceph.rook.io/v1/types.go`) — JSON tags for `SecuritySpec` and `KeyManagementServiceSpec` structs
- Rook KMS integration source code (`pkg/daemon/ceph/osd/kms/` and `vendor/github.com/libopenstorage/secrets/vault/`)
- HashiCorp Vault KV v2 secrets engine documentation — https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
- HashiCorp Vault Kubernetes auth method documentation — https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Kubernetes sidecar tutorial — https://developer.hashicorp.com/vault/tutorials/kubernetes/kubernetes-sidecar

## Issues Found

### 1. Wrong YAML field name for KMS configuration (Critical)
- **What was wrong:** The CephCluster YAML used `spec.security.keyManagementService` as the field path. The actual JSON tag in the Rook CRD is `"kms"`, so the correct YAML field is `spec.security.kms`.
- **What was changed:** Replaced `keyManagementService` with `kms`.
- **Why:** Using the wrong field name would cause the configuration to be silently ignored, resulting in OSD encryption keys being stored in Kubernetes Secrets instead of Vault.

### 2. Non-existent `enable: true` field (Critical)
- **What was wrong:** The YAML included `enable: true` under the KMS configuration. The `KeyManagementServiceSpec` struct has no `enable` field — KMS is implicitly enabled when `connectionDetails` are provided with a valid `KMS_PROVIDER`.
- **What was changed:** Removed the `enable: true` line.
- **Why:** This field does not exist in the CRD and would be ignored (or could cause validation errors depending on Kubernetes strict validation settings).

### 3. Missing `VAULT_SECRET_ENGINE` in connectionDetails (Moderate)
- **What was wrong:** The `connectionDetails` map was missing the `VAULT_SECRET_ENGINE` key, which tells Rook whether to use the KV or Transit secret engine.
- **What was changed:** Added `VAULT_SECRET_ENGINE: "kv"` to the connectionDetails.
- **Why:** While Rook may auto-detect the engine type in some cases, explicitly specifying it is recommended for reliable operation and matches official documentation examples.

## Review Notes
- The Vault policy `path "rook/osd/*"` technically works for KV v2 because Vault's trailing glob `*` matches across path segments (including `rook/osd/data/*` and `rook/osd/metadata/*`). However, HashiCorp best practice for KV v2 is to write explicit policies per sub-path (e.g., `rook/osd/data/*`, `rook/osd/metadata/*`). This is a style/best-practice concern rather than a functional error.
- The Vault role command uses `policies=` and `ttl=` which are deprecated aliases for `token_policies=` and `token_ttl=`. Both still work and HashiCorp's own tutorials still use the old names.
- The Vault Kubernetes auth config shown is correct when Vault runs inside the Kubernetes cluster. If Vault runs outside the cluster, additional parameters (`token_reviewer_jwt`, `kubernetes_ca_cert`) would be required.
- The `encryptedDevice: "true"` setting under `spec.storage.config` is correct for raw device/disk-based OSDs. For PVC-based clusters using `storageClassDeviceSets`, the correct field is `encrypted: true` (a boolean, not a string) — a distinction the post does not mention.
- The Vault `kv list` and `kv get` CLI commands are correct — the CLI automatically translates logical paths to the KV v2 API paths (`/data/`, `/metadata/`).
