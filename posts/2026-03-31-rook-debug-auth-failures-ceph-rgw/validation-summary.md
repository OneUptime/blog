# Validation Summary: How to Debug Authentication Failures in Ceph RGW

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- S3 authentication (Signature V2)
- STS (Secure Token Service)
- OIDC (OpenID Connect)
- AWS CLI (used against RGW endpoints)
- Kubernetes (kubectl)
- Python (hmac/hashlib for signature verification)

## Sources Consulted
- Ceph Logging and Debugging documentation — https://docs.ceph.com/en/latest/rados/troubleshooting/log-and-debug/
- Ceph RGW STS documentation — https://docs.ceph.com/en/latest/radosgw/STS/
- Ceph RGW IAM API documentation — https://docs.ceph.com/en/latest/radosgw/iam/
- Red Hat Ceph Storage: How to enable debug logs in RADOS Gateway — https://access.redhat.com/solutions/2085183
- AWS S3 REST Authentication (Signature V2) — https://docs.aws.amazon.com/AmazonS3/latest/API/RESTAuthentication.html
- AWS CLI `simulate-principal-policy` reference — https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html
- Python `hmac` module documentation — https://docs.python.org/3/library/hmac.html

## Issues Found

### 1. Invalid Ceph debug subsystem `debug_rgw_sts` (Step 5)
- **What was wrong:** The command `ceph config set client.rgw.my-store debug_rgw_sts 20` used a non-existent Ceph debug subsystem. There is no `debug_rgw_sts` option in Ceph; STS authentication logging is part of the general `debug_rgw` subsystem.
- **What was changed:** Replaced `debug_rgw_sts` with `debug_rgw` and added comments clarifying that STS debugging falls under the general RGW debug subsystem.
- **Why:** Using the invalid subsystem name would silently fail or produce an error, providing no additional logging output.

### 2. Unsupported IAM API `simulate-principal-policy` (Step 6)
- **What was wrong:** The post suggested using `aws iam simulate-principal-policy` against a Ceph RGW endpoint. Ceph RGW does not implement this IAM API operation — it only supports a subset of IAM APIs (CreateUser, PutUserPolicy, CreateRole, etc.).
- **What was changed:** Replaced the `simulate-principal-policy` command with a direct access test using `s3api get-object` with explicit credentials, which is a practical way to verify whether a specific user can access an object.
- **Why:** The original command would fail against any RGW endpoint, making this step useless for readers.

### 3. Misleading comment on `radosgw-admin user list` (Step 4)
- **What was wrong:** The comment said "Verify the access key exists in RGW" but `radosgw-admin user list` returns user UIDs, not access keys.
- **What was changed:** Updated the comment to "Verify the user exists in RGW (lists user UIDs)" to accurately describe what the command returns.
- **Why:** The original comment could confuse readers into thinking user UIDs are access keys.

## Review Notes
- The `ceph config set` command for `debug_rgw` applies dynamically in modern Ceph versions (Quincy+) without requiring a daemon restart. The post recommends a restart which is safe but unnecessary — readers should be aware that a restart is optional.
- The Python S3 V2 signature script is correct for simple GET requests but is a simplified example. It does not handle x-amz-* headers, subresource query parameters, or other edge cases that would affect real-world signature computation.
- The JWT base64 decoding command (`base64 -d`) may have padding issues since JWTs use base64url encoding without padding. The `2>/dev/null` suppresses errors but the output is usually correct in practice.
- S3 Signature V2 is deprecated by AWS in favor of Signature V4, though Ceph RGW still supports both. A future update could note this deprecation.
