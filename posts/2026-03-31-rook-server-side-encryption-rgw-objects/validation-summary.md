# Validation Summary: How to Set Up Server-Side Encryption for RGW Objects

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RADOS Gateway (RGW)
- Server-Side Encryption (SSE-C, SSE-KMS)
- HashiCorp Vault (KMS backend)
- AWS CLI (S3-compatible operations)
- Kubernetes ConfigMaps

## Sources Consulted
- Ceph RGW Encryption documentation: https://docs.ceph.com/en/latest/radosgw/encryption/
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Rook KMS configuration for RGW: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/vault/
- AWS CLI S3API reference for SSE options: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object.html
- Ceph configuration reference for `rgw_crypt_*` options: https://docs.ceph.com/en/latest/radosgw/config-ref/

## Issues Found

1. **Invalid Ceph config option `rgw_crypt_s3_kms_encryption_keys`**: This is not a valid Ceph configuration parameter. The correct option to specify the KMS backend is `rgw_crypt_s3_kms_backend`. Changed `rgw_crypt_s3_kms_encryption_keys = vault` to `rgw_crypt_s3_kms_backend = vault`.

2. **SSE-C MD5 computed on base64 string instead of raw key bytes**: The original command `echo -n "$KEY" | openssl dgst -md5 -binary | base64` computes the MD5 digest of the base64-encoded key string. However, the `--sse-customer-key-md5` parameter requires the base64-encoded MD5 of the raw (decoded) key bytes. Added `base64 --decode |` before the MD5 computation so the raw key bytes are hashed.

3. **`rgw_crypt_require_ssl = true` contradicts HTTP endpoints in examples**: The config sets `rgw_crypt_require_ssl = true`, which causes RGW to reject encryption requests over non-TLS connections. However, all CLI examples use `http://` endpoints. Changed to `rgw_crypt_require_ssl = false` so the examples work as written. In production, SSL should be enabled with HTTPS endpoints.

## Review Notes
- The post mentions two SSE modes (SSE-C and SSE-KMS), but Ceph RGW also supports SSE-S3 (server-managed keys). This is not technically wrong since the post scopes itself to these two modes, but readers should be aware SSE-S3 is also available.
- In production deployments, `rgw_crypt_require_ssl` should be set to `true` with proper TLS termination configured. The `false` value is appropriate only for testing.
- The `VAULT_SECRET_PATH` value `secret/data/rgw-encryption` uses the KV v2 path format, which is correct for Vault's default KV v2 secret engine.
