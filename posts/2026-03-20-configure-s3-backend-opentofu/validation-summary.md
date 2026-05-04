# Validation Summary: How to Configure the S3 Backend in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI: `tofu`)
- Terraform HCL configuration language
- AWS S3 (remote state storage, versioning, server-side encryption, public access block)
- AWS DynamoDB (state locking)
- AWS IAM (permissions policy)
- AWS provider for Terraform/OpenTofu

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu CLI `init` documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu 1.10 release notes (native S3 locking via `use_lockfile`)
- AWS provider documentation for `aws_s3_bucket`, `aws_s3_bucket_versioning`, `aws_s3_bucket_server_side_encryption_configuration`, `aws_s3_bucket_public_access_block`, `aws_dynamodb_table`

## Issues Found
1. **Missing IAM permission `dynamodb:DescribeTable`** — The official OpenTofu S3 backend documentation lists `dynamodb:DescribeTable` as a required action for DynamoDB-based state locking, alongside `GetItem`, `PutItem`, and `DeleteItem`. The original IAM policy snippet omitted it. Added `dynamodb:DescribeTable` to the DynamoDB statement so the policy matches the documented minimum.
2. **Misleading comment on `tofu init -reconfigure`** — The original comment "Show current backend configuration" misrepresented this flag. Per the OpenTofu CLI docs, `-reconfigure` disregards any existing backend configuration and forces re-initialization; it does not display configuration. Updated the comment to accurately describe the flag's behavior.

## Review Notes
- The `terraform { backend "s3" { ... } }` block syntax is correct in OpenTofu — the keyword remains `terraform`, not `tofu`, for compatibility.
- `dynamodb_table` is not deprecated; the OpenTofu team explicitly states both DynamoDB and native S3 locking remain fully supported. The post correctly notes both options exist.
- Native S3 locking via `use_lockfile = true` (introduced in OpenTofu 1.10) is mentioned in the introduction but not demonstrated. A future enhancement could include a brief example of `use_lockfile`-based locking, since it removes the need for DynamoDB entirely.
- The default `workspace_key_prefix` value of `"env:"` is correct.
- All AWS provider resources referenced (`aws_s3_bucket_versioning`, `aws_s3_bucket_server_side_encryption_configuration`, `aws_s3_bucket_public_access_block`) use the current post-AWS-provider-v4 split-resource style, which is correct.
- The `lifecycle { prevent_destroy = true }` on the state bucket is a recommended safeguard.
- Consider adding `s3:PutObjectTagging` to the IAM policy if using OpenTofu 1.11+ features that tag the state object, though this is not strictly required for the basic configuration shown.
