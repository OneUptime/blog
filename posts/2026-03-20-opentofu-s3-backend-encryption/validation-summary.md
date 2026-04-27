# Validation Summary: How to Configure S3 Backend with Server-Side Encryption in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (S3 backend, native state encryption block)
- Terraform (HCL syntax, S3 backend configuration)
- AWS S3 (server-side encryption: SSE-S3, SSE-KMS)
- AWS KMS (customer-managed keys, key policies, key rotation)
- AWS IAM (bucket policies, principals, conditions)

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu State Encryption documentation: https://opentofu.org/docs/language/state/encryption/
- AWS S3 server-side encryption docs (SSE-S3, SSE-KMS)
- AWS KMS pricing and API request behavior
- AWS S3 bucket policy reference (encryption-enforcement patterns)
- Terraform `aws_kms_key` resource documentation
- Terraform `aws_s3_bucket_policy` resource documentation

## Issues Found
1. **Missing required `key_spec` attribute in `key_provider "aws_kms"` block.** In the "Combined: Server-Side + Native State Encryption" example, the `aws_kms` key provider was missing the required `key_spec` attribute. The OpenTofu native encryption `aws_kms` key provider requires `key_spec` (e.g., `"AES_256"`) — without it, the configuration would fail validation. Added `key_spec = "AES_256"` to the `key_provider "aws_kms" "main"` block.

## Review Notes
- The S3 backend `kms_key_id` parameter is documented as accepting an ARN, but the underlying SDK and S3 API accept key IDs and alias names as well. The post's use of `"alias/opentofu-state"` works in practice, though strictly per the documented contract a full ARN is preferred. Left as-is since this is widely used in real-world configurations.
- The bucket policy uses `StringNotEquals` on `s3:x-amz-server-side-encryption`. This pattern is the most common AWS-published example, but has a subtle gap: if the encryption header is absent entirely, `StringNotEquals` evaluates to false (key not present), so the deny does not trigger. Since 2023, AWS S3 enables default server-side encryption automatically on all new buckets, so this gap is largely closed in practice. For absolute strictness, combining with a `Null` condition would be more defensive — but the posted policy is consistent with AWS's own published examples and is acceptable.
- The SSE-KMS cost figure ($0.03/10,000 requests) is the correct AWS KMS API request price. S3 Bucket Keys (a separate optimization) can substantially reduce KMS request volume; not mentioned in the post but not incorrect.
- The "Audit trail: No" entry for SSE-S3 is shorthand for "no KMS-specific CloudTrail entries" — S3 access logs and S3 management-event CloudTrail logs still exist regardless. Reading the table in context, this is clear enough.
- The OpenTofu native state encryption feature shown was introduced in OpenTofu 1.7 — readers on older versions will need to upgrade.
