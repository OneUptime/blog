# Validation Summary: How to Configure S3 Backend with IAM Role Assumption in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (S3 backend)
- Terraform (S3 backend syntax compatibility)
- AWS IAM (role assumption, trust policies, permissions policies)
- AWS S3 (state storage)
- AWS DynamoDB (state locking)
- AWS STS (sts:AssumeRole)
- HCL configuration language

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu `assume_role` block reference (nested attributes: role_arn, session_name, external_id, duration, policy, etc.)
- AWS IAM trust policy reference (sts:AssumeRole, Principal, Effect)
- AWS IAM policy syntax for S3 (GetObject, PutObject, ListBucket) and DynamoDB (GetItem, PutItem, DeleteItem) state-locking permissions

## Issues Found
- The original post used the deprecated top-level S3 backend arguments `role_arn`, `session_name`, and `external_id`. In current OpenTofu these arguments must be placed inside a nested `assume_role = { ... }` block; the top-level forms are documented as deprecated. Updated all five backend blocks (Basic Role Assumption, Cross-Account Configuration, External ID for Additional Security, Partial Configuration, and Chained Role Assumption) to use the `assume_role` nested object.
- The `tofu init -backend-config="role_arn=..."` CLI example would not work after the migration to the nested `assume_role` object, because `-backend-config="key=value"` only supports flat key/value pairs and cannot directly set a nested object attribute. Replaced with a `backend-prod.hcl` file passed via `-backend-config=backend-prod.hcl`, which is the documented and reliable way to supply nested backend config.
- Fixed a typo: "commited" → "committed" in the partial-configuration code comment.

## Review Notes
- The IAM trust policy and permissions policy are syntactically and semantically correct for the use case (state-only access). Using `Principal.AWS = "arn:aws:iam::WORKLOAD-ACCOUNT-ID:root"` delegates trust to the workload account so that any principal there with a matching IAM permission can assume the role; this matches AWS's documented cross-account pattern. For tighter scoping in real environments, restricting the principal to specific role ARNs or adding an `external_id` Condition is preferable, but this is a stylistic recommendation, not a correctness issue.
- The DynamoDB resource ARN uses a wildcard for the account ID (`arn:aws:dynamodb:us-east-1:*:table/terraform-state-lock`). This is syntactically valid in IAM policy resource ARNs, but real deployments should pin it to the specific account.
- `dynamodb_table` for state locking is still fully supported by OpenTofu and the team has stated no plans to deprecate it. As of OpenTofu 1.10+, native S3 locking via `use_lockfile = true` is also supported and is the newer recommended approach. The post's continued use of `dynamodb_table` is correct, not deprecated; future revisions could mention `use_lockfile` as an alternative.
- The provider `assume_role { ... }` block (without `=`) in the chained role section is correct — the AWS provider defines `assume_role` as a configuration block, while the S3 backend defines it as a nested object/map (hence `assume_role = { ... }`). The two different syntaxes are intentional.
