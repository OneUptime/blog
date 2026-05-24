# Validation Summary: How to Fix Terraform Permission Denied Errors on State File

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (state management, backends)
- AWS S3 (state storage)
- AWS DynamoDB (state locking)
- AWS IAM (policies, cross-account roles)
- AWS KMS (encryption)
- Azure Blob Storage (azurerm backend)
- Azure RBAC (role assignments)
- Google Cloud Storage (gcs backend)
- Google Cloud IAM (gsutil iam ch)
- Terraform Cloud / HCP Terraform (workspace permissions, API)
- Unix file permissions (chmod, chown)

## Sources Consulted
- HashiCorp Terraform S3 Backend docs: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform azurerm Backend docs: https://developer.hashicorp.com/terraform/language/backend/azurerm
- HashiCorp Terraform GCS Backend docs: https://developer.hashicorp.com/terraform/language/backend/gcs
- HCP Terraform Account API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/account
- HCP Terraform Workspace Permissions: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/permissions/workspace
- Google Cloud Storage IAM permissions for gsutil: https://docs.cloud.google.com/storage/docs/access-control/iam-gsutil
- AWS S3 bucket policy syntax (DenyUnencryptedObjectUploads pattern)

## Issues Found

1. **Missing `dynamodb:DescribeTable` in S3 backend IAM policy** — The minimum IAM policy for S3 backend listed only `GetItem`, `PutItem`, `DeleteItem` for DynamoDB. Per HashiCorp's official S3 backend docs, `dynamodb:DescribeTable` is also part of the documented minimum permissions. Added it to the policy.

2. **Wrong IAM binding prefix in `gsutil iam ch`** — The command used `user:deploy@my-project.iam.gserviceaccount.com:...`, but the email ending in `.iam.gserviceaccount.com` is a service account. GCP IAM requires the `serviceAccount:` prefix for service accounts; `user:` is only for human Google accounts. Changed prefix to `serviceAccount:`.

3. **Deprecated `role_arn` argument in S3 backend cross-account example** — The top-level `role_arn` argument on the `backend "s3"` block has been deprecated in favor of the nested `assume_role` block. Restructured the cross-account example to use the current recommended `assume_role = { role_arn = "..." }` syntax.

## Review Notes

- DynamoDB-based state locking is still supported but is now considered deprecated by HashiCorp. Terraform 1.10+ supports S3-native locking via `use_lockfile = true`, which avoids needing a DynamoDB table at all. The post's DynamoDB-based approach still works and remains common in production setups, so leaving it as-is is appropriate.
- The post simplifies Terraform Cloud workspace permission levels (Read / Write / Admin). The full set is actually Read, Plan, Write, Admin, plus a Custom option. This simplification is acceptable for a troubleshooting guide.
- HashiCorp now recommends OIDC/workload identity over static `ARM_ACCESS_KEY` for Azure backends, but the access-key approach shown in the post is still functional and supported.
- The S3 backend's `kms_key_id`, `encrypt`, `dynamodb_table`, `bucket`, `key`, and `region` arguments are all current and correct.
- The Terraform Cloud `cloud {}` block syntax (introduced in Terraform 1.1) is correct.
- AWS CLI, gcloud, gsutil, az CLI commands are all syntactically valid and produce the described results.
