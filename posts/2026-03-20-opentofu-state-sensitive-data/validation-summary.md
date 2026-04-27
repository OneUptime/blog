# Validation Summary: How to Handle State File Sensitive Data Exposure in OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu (state management, native state encryption)
- Terraform (shared `terraform` block syntax)
- HCL configuration language
- AWS S3 (remote backend)
- AWS KMS (server-side encryption)
- AWS DynamoDB (state locking)
- AWS IAM (access policies)
- AWS Secrets Manager (data source for runtime secrets)
- AWS CloudTrail (audit logging)
- `jq` (JSON parsing on the CLI)

## Sources Consulted
- OpenTofu State Encryption documentation: https://opentofu.org/docs/language/state/encryption/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- Terraform/OpenTofu `sensitive` variable and output documentation
- AWS Secrets Manager Terraform/OpenTofu provider docs (`aws_secretsmanager_secret_version` data source)
- AWS CloudTrail `lookup-events` CLI reference

## Issues Found
No technical issues found.

Verified specifically:
- `terraform { encryption { ... } }` block location is correct.
- `key_provider "pbkdf2" "main" { passphrase = ... }` syntax is correct.
- `method "aes_gcm" "main" { keys = key_provider.pbkdf2.main }` correctly uses the plural `keys` attribute (not `key`).
- `state { method = method.aes_gcm.main }` reference syntax is correct.
- S3 backend options (`bucket`, `key`, `region`, `encrypt`, `kms_key_id`, `dynamodb_table`) are valid.
- `tofu state pull` is a real OpenTofu command that emits the state JSON suitable for `jq`.
- `aws_iam_policy` resource with `policy = jsonencode({...})` is valid HCL.
- `variable` and `output` `sensitive = true` semantics are described accurately, including the caveat that it does not protect values stored in state.
- `data "aws_secretsmanager_secret_version"` with `secret_id` and `.secret_string` is correct usage.
- `aws cloudtrail lookup-events --lookup-attributes AttributeKey=ResourceName,AttributeValue=...` flag syntax is correct.

## Review Notes
- The S3 backend example uses `dynamodb_table` for state locking. This still works in current OpenTofu versions, but OpenTofu has also added native S3 lockfile support (`use_lockfile = true`) as a DynamoDB-free alternative. Either approach is valid; no change required.
- The IAM policy snippet shows an identity-based policy attached via `aws_iam_policy` (no `Principal` needed). This is correct as written; readers wanting a bucket policy would need a different resource (`aws_s3_bucket_policy`) and would include a `Principal`. The post does not claim to show a bucket policy, so this is fine.
- The post correctly emphasizes that `sensitive = true` only redacts CLI output and does not encrypt or hide values inside the state file — a common point of confusion.
