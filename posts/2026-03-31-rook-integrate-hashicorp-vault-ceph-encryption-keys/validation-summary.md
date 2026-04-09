# Validation Summary: How to Integrate HashiCorp Vault for Ceph Encryption Keys

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage — OSD encryption, RGW SSE-KMS)
- HashiCorp Vault (KV v2 secrets engine, Transit secrets engine, Kubernetes auth method, audit logging)
- Kubernetes (CRDs, service accounts, auth integration)
- LUKS (disk encryption for BlueStore OSDs)

## Sources Consulted
- Rook official documentation: Key Management System integration (https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/)
- Rook source code: `pkg/apis/ceph.rook.io/v1/types.go` (CephCluster CRD SecuritySpec struct, JSON tag `"kms"`)
- Rook source code: `pkg/daemon/ceph/osd/kms/vault_api.go` (VAULT_BACKEND auto-detection logic)
- libopenstorage/secrets vault library: `vault/utils/utils.go` (auth-related connection detail constants)
- HashiCorp Vault docs: Transit Secrets Engine (https://developer.hashicorp.com/vault/docs/secrets/transit)
- HashiCorp Vault docs: Transit API (https://developer.hashicorp.com/vault/api-docs/secret/transit)
- HashiCorp Vault docs: KV v2 Secrets Engine (https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2)
- HashiCorp Vault docs: Audit log schema (https://developer.hashicorp.com/vault/docs/audit/schema)
- HashiCorp Vault docs: Kubernetes Auth Method (https://developer.hashicorp.com/vault/docs/auth/kubernetes)

## Issues Found

### 1. CephCluster YAML field name incorrect (Critical)
- **What was wrong:** The blog used `spec.security.keyManagementService` as the YAML field name.
- **What was changed:** Corrected to `spec.security.kms`.
- **Why:** The Rook CRD Go struct uses the JSON tag `json:"kms,omitempty"` for the `KeyManagementService` field. In Kubernetes CRDs, YAML field names must match JSON tags, not Go field names. Using `keyManagementService` would be silently ignored by Kubernetes, making the entire KMS configuration non-functional.

### 2. Removed spurious `enable: true` field
- **What was wrong:** The CephCluster YAML included `enable: true` under the KMS section.
- **What was changed:** Removed `enable: true`.
- **Why:** The `KeyManagementServiceSpec` struct in Rook does not have an `enable` boolean field. KMS is considered enabled when `connectionDetails` are present. This field would be silently ignored but is misleading.

### 3. Missing `VAULT_SECRET_ENGINE` connection detail (Critical)
- **What was wrong:** The `connectionDetails` map was missing `VAULT_SECRET_ENGINE: "kv"`.
- **What was changed:** Added `VAULT_SECRET_ENGINE: "kv"` to connectionDetails.
- **Why:** Rook requires this field to determine which Vault secrets engine to use (kv vs transit). Without it, the backend version detection logic is entirely skipped, potentially causing integration failures.

### 4. Missing `VAULT_BACKEND` connection detail
- **What was wrong:** The blog enables KV v2 with `vault secrets enable -path=rook/osd kv-v2` but did not specify the backend version in the CephCluster config.
- **What was changed:** Added `VAULT_BACKEND: "v2"` to connectionDetails.
- **Why:** While Rook can auto-detect the KV version by calling `sys/mounts`, this requires the service account to have list permission on system mounts. Explicitly setting `VAULT_BACKEND: "v2"` avoids this extra API call and potential permission failure.

### 5. Invalid connection detail field name `VAULT_AUTH_KUBERNETES_PATH`
- **What was wrong:** The blog used `VAULT_AUTH_KUBERNETES_PATH: "kubernetes"` which is not a recognized field in the libopenstorage/secrets Vault library.
- **What was changed:** Corrected to `VAULT_AUTH_MOUNT_PATH: "kubernetes"`.
- **Why:** The correct field name per the library is `VAULT_AUTH_MOUNT_PATH`. It defaults to `"kubernetes"` when omitted, so this field is optional but was renamed to the correct key for accuracy.

### 6. Incorrect jq field reference in audit log command
- **What was wrong:** The jq filter used bare `path` which references a non-existent top-level `.path` field, producing `null`.
- **What was changed:** Changed `{time, path, operation: .request.operation}` to `{time, path: .request.path, operation: .request.operation}`.
- **Why:** In Vault audit log entries, the request path is nested at `.request.path`, not at the top level. The `.time` and `.type` fields are top-level, but `.path` and `.operation` are under `.request`.

## Review Notes
- The `vault write -f transit/keys/ceph-rgw-key type=aes256-gcm96` command works correctly but the `-f` flag is redundant when data parameters (`type=...`) are already provided. Not changed since it is functionally correct.
- The `aes256-gcm96` key type is valid and is the default for Vault Transit, so specifying it explicitly is redundant but not wrong.
- The OSD policy `rook/osd/*` is broader than strictly necessary for KV v2 (which routes through `data/`, `metadata/`, etc. sub-paths), but it works correctly as a catch-all. A production setup might want tighter policies.
- The blog covers OSD encryption configuration but does not show the corresponding CephObjectStore YAML for RGW SSE-KMS with Transit. This is not an error — the post focuses on OSD encryption — but readers interested in the RGW use case mentioned in the intro would need to look elsewhere for the CephObjectStore configuration.
- The `tokenSecretName: ""` is correct for Kubernetes auth — Rook checks `TokenSecretName != ""` to determine if token auth is enabled.
