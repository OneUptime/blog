# Validation Summary: How to Export Dapr mTLS Root Certificates

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (mTLS, Sentry, trust bundle)
- Kubernetes (secrets, kubectl)
- OpenSSL (certificate inspection and verification)
- Dapr CLI (`dapr mtls export`)
- GPG (symmetric encryption for backup)
- AWS CLI (S3 upload)

## Sources Consulted
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr CLI `dapr mtls export` reference: https://docs.dapr.io/reference/cli/dapr-mtls/dapr-mtls-export/
- Dapr security concepts: https://docs.dapr.io/concepts/security-concept/
- OpenSSL x509 and verify man pages
- GNU coreutils base64 vs macOS BSD base64 behavior

## Issues Found

### 1. Cross-cluster trust federation: incorrect secret key approach (critical)
**What was wrong:** The original command added Cluster A's root CA as a *new key* (`cluster-a-ca.crt`) in the `dapr-trust-bundle` secret. Dapr only reads the `ca.crt` key for trust anchors — a custom key name would be silently ignored, meaning the cross-cluster trust would not actually work.

**What was changed:** Replaced the approach with the correct method: export the existing `ca.crt` from Cluster B, concatenate Cluster A's root CA to it, then update the `ca.crt` field with the combined PEM bundle using a `replace` JSON patch operation.

### 2. `base64 -w0` portability (minor, fixed alongside issue 1)
**What was wrong:** The original command used `base64 -w0` which is a GNU coreutils flag (Linux). On macOS, BSD `base64` does not support the `-w` flag and the command would fail.

**What was changed:** Replaced with `base64 < file | tr -d '\n'` which is portable across Linux and macOS.

## Review Notes
- The workload certificate extraction path (`/var/run/secrets/dapr.io/tls/tls.crt`) assumes file-based cert delivery. In default Dapr deployments, daprd receives its workload certificate from Sentry via gRPC and holds it in memory. The file path may only be valid with specific configurations. The post does note "requires debug access" which partially addresses this, but future readers should be aware this may not work in all setups.
- The cross-cluster trust federation section, even after fixing, shows a manual patching approach. For production multi-cluster deployments, the recommended approach is to establish a shared root CA before installing Dapr on each cluster. The Helm chart supports providing custom certificates during installation.
- All `kubectl`, `openssl`, `dapr CLI`, `gpg`, and `aws s3 cp` commands use correct syntax and flags.
- The secret name (`dapr-trust-bundle`), namespace (`dapr-system`), and key names (`ca.crt`, `issuer.crt`, `issuer.key`) are all verified correct per official Dapr documentation.
