# Validation Summary: How to Configure Bucket Encryption in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Server-Side Encryption (SSE-S3 and SSE-KMS)
- HashiCorp Vault (Transit and KV secret engines)
- AWS CLI (S3 API)
- systemd (service management)

## Sources Consulted
- Ceph official documentation — Encryption section: https://docs.ceph.com/en/reef/radosgw/encryption/
- Ceph configuration reference (Reef): https://docs.ceph.com/en/reef/radosgw/config-ref/
- Ceph source code — `rgw.yaml.in` config definitions for `rgw_crypt_*` options
- AWS CLI documentation for `s3api put-bucket-encryption`, `s3 cp --sse`, and `s3api head-object`

## Issues Found

### 1. SSE-S3 section used wrong configuration option (Major)
- **What was wrong:** The SSE-S3 section used `rgw_crypt_s3_kms_encryption_keys`, which is a developer-only SSE-KMS testing option, not an SSE-S3 configuration. This option provides inline keys for the SSE-KMS `testing` backend and is not intended for production use.
- **What was changed:** Replaced with the correct SSE-S3 configuration using `rgw_crypt_sse_s3_backend = vault` and associated `rgw_crypt_sse_s3_vault_*` options (addr, auth, token_file, secret_engine).
- **Why:** SSE-S3 in Ceph requires a Vault backend. Ceph automatically creates and manages encryption keys in Vault's Transit engine, making key management invisible to users — but Vault is still required.

### 2. SSE-S3 description was misleading (Major)
- **What was wrong:** The post described SSE-S3 as "RGW manages encryption keys internally" and referenced a "built-in key store." In Ceph, SSE-S3 still requires HashiCorp Vault — Ceph just automates the key lifecycle within Vault.
- **What was changed:** Updated the mode description to "Ceph automatically manages encryption keys in Vault" and the section intro to accurately describe the Vault requirement.
- **Why:** Readers following the original instructions would not set up Vault for SSE-S3 and encryption would fail.

### 3. Example base64 key was 16 bytes, not 32 bytes as claimed (Major)
- **What was wrong:** The example key `YWJjZGVmZ2hpamtsbW5vcA==` decodes to `abcdefghijklmnop` (16 bytes / 128 bits), but the text claimed it was a "base64-encoded 32-byte AES key." Ceph requires 256-bit (32-byte) encryption keys.
- **What was changed:** Removed the incorrect inline key and `openssl rand` command since SSE-S3 with Vault uses automatic key generation via the Transit engine.
- **Why:** The key size mismatch would cause confusion, and the key generation instruction was irrelevant to the corrected SSE-S3 configuration.

### 4. Summary section inaccuracy
- **What was wrong:** The summary stated "SSE-S3 with internally managed keys" which was incorrect.
- **What was changed:** Updated to "SSE-S3 with Vault-managed keys (automatic key lifecycle)" to accurately distinguish it from SSE-KMS.

## Review Notes
- The `rgw_crypt_require_ssl = false` setting disables SSL enforcement for encryption requests. The default is `true`. This is appropriate for testing/development but should not be used in production. The post does not include this caveat.
- The SSE-KMS Vault configuration section (option names and values) is correct and verified against the Ceph Reef config reference.
- The AWS CLI commands (`put-bucket-encryption`, `s3 cp --sse`, `head-object`) are syntactically correct.
- The `rgw_crypt_sse_s3_backend` option and SSE-S3 Vault integration require Ceph Quincy (v17) or later. The post does not specify a minimum Ceph version.
- The `rgw_crypt_vault_prefix = /v1/secret/data/rgw` in the SSE-KMS section is correct for Vault KV v2 engine; the exact path may vary by deployment.
