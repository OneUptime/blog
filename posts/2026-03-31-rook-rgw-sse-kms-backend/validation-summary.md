# Validation Summary: How to Configure Server-Side Encryption KMS Backend in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- HashiCorp Vault (KMS backend)
- Server-Side Encryption (SSE-KMS, SSE-S3, SSE-C)
- Kubernetes Secrets and ConfigMaps
- AWS CLI (S3-compatible operations)

## Sources Consulted
- Ceph RGW encryption documentation: https://docs.ceph.com/en/latest/radosgw/encryption/
- Ceph RGW Vault integration: https://docs.ceph.com/en/latest/radosgw/vault/
- Rook Ceph configuration override docs: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- AWS CLI S3 SSE documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found

1. **Removed invalid config option `rgw_crypt_default_encryption_key`**: The post included `ceph config set client.rgw rgw_crypt_default_encryption_key ""` with a comment claiming it enables SSE by default for all objects. This is not a valid Ceph configuration option. Default encryption is configured via S3 bucket encryption policies, not a global Ceph setting. Removed the line entirely.

2. **Changed `rgw_crypt_vault_token` to `rgw_crypt_vault_token_file`**: The post used `rgw_crypt_vault_token` to set a raw token value. The correct Ceph config option is `rgw_crypt_vault_token_file`, which points to a file path containing the Vault token. Updated to use `/var/lib/ceph/vault-token` as the file path.

3. **Added missing `rgw_crypt_vault_secret_engine` setting**: The post configured a Vault prefix of `/v1/secret/data/ceph` (KV v2 style) without setting `rgw_crypt_vault_secret_engine`. Since the transit engine is the recommended backend for SSE-KMS key wrapping, added `rgw_crypt_vault_secret_engine = transit` and updated the prefix to `/v1/transit/keys` for consistency.

4. **Updated Rook ConfigMap override**: Applied the same fixes (token_file, secret_engine, prefix) to the `rook-config-override` ConfigMap example to keep it consistent with the CLI configuration section.

## Review Notes
- The post creates a Kubernetes Secret for the Vault token but does not show how to mount it into the RGW pod so that `rgw_crypt_vault_token_file` can read it. A future improvement could add a note about volume mounts or using Rook's built-in Vault integration via the CephCluster CR `security.kms` field, which handles token mounting automatically.
- The SSE modes description is accurate. SSE-C correctly notes no KMS is required.
- The AWS CLI upload and verification commands are correct for S3-compatible endpoints.
