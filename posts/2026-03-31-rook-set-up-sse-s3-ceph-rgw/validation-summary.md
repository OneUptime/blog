# Validation Summary: How to Set Up Server-Side Encryption (SSE-S3) for Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- SSE-S3 (Server-Side Encryption with S3-Managed Keys)
- HashiCorp Vault (transit secret engine)
- Rook Ceph Operator (CephObjectStore CRD)
- AWS CLI (s3 and s3api commands)
- Kubernetes

## Sources Consulted
- Ceph official documentation on RGW encryption: https://docs.ceph.com/en/latest/radosgw/encryption/
- Ceph source code for config options: `src/common/options/rgw.yaml.in` (confirming `rgw_crypt_sse_s3_*` option names)
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Ceph cephadm orchestrator operations documentation: https://docs.ceph.com/en/latest/cephadm/operations/
- AWS CLI s3 and s3api command reference

## Issues Found

1. **Incorrect minimum Ceph version**: The post stated "Ceph 14.2+ (Nautilus)" as a prerequisite. SSE-S3 with Vault backend was introduced in Ceph 17.2 (Quincy), not Nautilus. Nautilus only supported SSE-C and SSE-KMS. Fixed to "Ceph 17.2+ (Quincy)".

2. **Incorrect Rook CephObjectStore YAML**: The post showed `spec.security.s3.enabled: true` and `spec.security.s3.kmsEnabled: false`, which are fields that do not exist in the Rook CephObjectStore CRD. The correct structure uses `spec.security.s3.connectionDetails` (a map with KMS_PROVIDER, VAULT_ADDR, VAULT_BACKEND_PATH, VAULT_SECRET_ENGINE) and `spec.security.s3.tokenSecretName` (a reference to a Kubernetes secret). Fixed to use the correct CRD fields.

## Review Notes
- The `ceph config set` commands correctly use the `rgw_crypt_sse_s3_*` prefix (distinct from SSE-KMS options which use `rgw_crypt_s3_kms_*` and `rgw_crypt_vault_*`).
- The `--sse AES256` flag is correct for `aws s3` high-level commands. For `aws s3api put-object`, the equivalent would be `--server-side-encryption AES256`.
- The bucket policy JSON for enforcing SSE-S3 is correct and follows the standard AWS S3 pattern supported by Ceph RGW.
- The `ceph orch restart rgw.default` command is valid, though the service ID (`rgw.default`) must match the actual deployed service name.
