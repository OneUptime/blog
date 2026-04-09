# Validation Summary: How to Configure KMS for Object Store Encryption in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph RGW (RADOS Gateway) server-side encryption
- HashiCorp Vault transit secrets engine
- Kubernetes Secrets
- AWS CLI (S3-compatible operations)

## Sources Consulted
- [Ceph RGW Vault Integration Documentation](https://docs.ceph.com/en/latest/radosgw/vault/) — verified `rgw_crypt_*` config option names, prefix path format, and transit engine modes
- [HashiCorp Vault Transit Secrets Engine API](https://developer.hashicorp.com/vault/api-docs/secret/transit) — verified key types (`aes256-gcm96`), `exportable` parameter, datakey and decrypt endpoints
- [Rook CephObjectStore CRD Documentation (v1.16)](https://rook.io/docs/rook/v1.16/CRDs/Object-Storage/ceph-object-store-crd/) — verified `rgwConfig` and `rgwConfigFromSecret` field existence and syntax
- [Rook GitHub PR #15426](https://github.com/rook/rook/pull/15426) — `rgwConfigFromSecret` feature implementation and correct map-based syntax
- [Rook Key Management System Documentation](https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/) — verified `security.kms` as the Rook-native KMS integration approach

## Issues Found

### 1. Incorrect `rgw_crypt_vault_prefix` value
- **What was wrong:** The prefix was set to `"transit"` (a bare word), but RGW constructs the Vault URL by concatenating `{vault_addr}{prefix}/{key_id}`. The bare word would produce an invalid URL like `https://vault.example.com:8200transit/rgw-s3-key`, missing the `/v1/` API version prefix and leading slash.
- **What was changed:** Changed `rgw_crypt_vault_prefix: "transit"` to `rgw_crypt_vault_prefix: "/v1/transit"`.
- **Why:** The Ceph documentation specifies that the prefix should be a URL path such as `/v1/transit` (for the modern datakey mode) or `/v1/transit/export/encryption-key` (for legacy export mode). Using `/v1/transit` matches the recommended configuration for new deployments.

### 2. Incorrect `rgwConfigFromSecret` syntax
- **What was wrong:** The blog used a list format with fields `secretName`, `dataField`, and `configField`, which does not match the Rook CRD schema. The actual `rgwConfigFromSecret` field (added in Rook v1.16 via PR #15426) uses a map where keys are Ceph config option names and values are objects with `name` (secret name) and `key` (data key within the secret).
- **What was changed:** Changed from the incorrect list format to the correct map format: `rgw_crypt_vault_token_file: { name: vault-kms-secret, key: token }`.
- **Why:** The incorrect syntax would cause Rook to reject the CephObjectStore resource with a validation error.

### 3. Insufficient Vault policy paths
- **What was wrong:** The policy used `transit/+/rgw-s3-key` as a wildcard path. Vault's `+` wildcard matches only a single path segment. For the modern transit datakey mode, RGW needs access to `transit/datakey/plaintext/rgw-s3-key` (two segments after `transit/`), which the `+` wildcard cannot match. Similarly, for legacy export mode, `transit/export/encryption-key/rgw-s3-key` also has two segments after `transit/`.
- **What was changed:** Replaced the single wildcard rule with two explicit path rules: `transit/datakey/plaintext/rgw-s3-key` (for generating data encryption keys) and `transit/decrypt/rgw-s3-key` (for decrypting wrapped keys on read).
- **Why:** Without the correct policy paths, RGW would receive 403 Forbidden errors from Vault when attempting to generate or decrypt data encryption keys, causing all SSE-KMS upload and read operations to fail.

## Review Notes
- The blog post uses `rgwConfig` to manually set `rgw_crypt_*` options. While this works, Rook provides a dedicated `spec.security.kms` section in the CephObjectStore CRD that is the officially recommended approach for KMS integration. The `security.kms` approach handles Vault connection, authentication, and token mounting automatically.
- The `type=aes256-gcm96` parameter in the Vault key creation command is valid but redundant, as `aes256-gcm96` is the default transit key type. This is not an error, just a minor observation.
- Modern Ceph (Pacific+) uses a new transit datakey mode by default (compat=0/1) where Vault generates wrapped data keys. In this mode, transit keys do NOT need to be created with `exportable=true`, which aligns with the blog post's key creation command. The Ceph documentation now explicitly recommends against marking keys as exportable for new deployments.
- The `aws s3 cp --sse aws:kms` and `--sse AES256` commands, the RGW service endpoint format, and the `head-object` verification approach are all correct.
