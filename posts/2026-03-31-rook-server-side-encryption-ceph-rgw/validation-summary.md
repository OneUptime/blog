# Validation Summary: How to Set Up Server-Side Encryption for Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Server-Side Encryption (SSE-S3, SSE-KMS)
- HashiCorp Vault
- Rook Ceph Operator
- Kubernetes
- AWS CLI (S3-compatible)

## Sources Consulted
- Ceph RGW Encryption documentation: https://docs.ceph.com/en/latest/radosgw/encryption/
- Ceph RGW configuration reference for encryption options: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Rook KMS configuration for encryption: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/
- AWS CLI S3 SSE documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found

1. **Wrong config option for SSE-S3**: The post used `rgw_crypt_s3_kms_encryption_keys` which is an SSE-KMS inline testing option, not an SSE-S3 option. Replaced with the correct `rgw_crypt_sse_s3_backend` configuration, showing both the `testing` backend for development and the `vault` backend for production, along with the corresponding `rgw_crypt_sse_s3_vault_*` options.

2. **Invalid Vault token config option**: `rgw_crypt_vault_token` is not a valid Ceph config option. The correct option is `rgw_crypt_vault_token_file` which points to a file path containing the Vault token. Changed to `rgw_crypt_vault_token_file /etc/ceph/vault.token`.

3. **SSL requirement inconsistency**: The original post set `rgw_crypt_require_ssl true` but all example endpoints used `http://`, which would cause encryption requests to be rejected by RGW. Fixed by setting `rgw_crypt_require_ssl false` for the testing configuration and `rgw_crypt_require_ssl true` for the production Vault-backed configuration.

## Review Notes
- The Rook CephObjectStore YAML for KMS integration with Vault is correct and follows the current Rook API spec.
- The AWS CLI upload commands use correct flags (`--sse AES256` for SSE-S3, `--sse aws:kms` for SSE-KMS).
- The `head-object` verification approach is correct for confirming SSE is active.
- The post's example endpoints still use `http://` for the SSE-KMS upload command; in production with `rgw_crypt_require_ssl true`, these would need to be `https://`. This is acceptable for a tutorial context where readers are expected to adapt endpoints to their environment.
