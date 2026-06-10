# Validation Summary: How to Build Terraform Backend Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.0+, with examples targeting 1.6)
- AWS S3 + DynamoDB (state storage and locking)
- Google Cloud Storage (GCS) backend
- Azure Blob Storage backend
- Terraform Cloud (`cloud` block)
- AWS KMS (state encryption)
- AWS IAM (least-privilege policies)
- GitHub Actions (CI/CD)
- GitLab CI (CI/CD)
- HCL configuration syntax
- Terraform CLI commands (`init`, `workspace`, `state`, `force-unlock`)

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform azurerm backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform Cloud `cloud` block documentation: https://developer.hashicorp.com/terraform/cli/cloud/settings
- Terraform `force-unlock` command: https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- Terraform workspaces: https://developer.hashicorp.com/terraform/language/state/workspaces
- AWS Provider docs: `aws_s3_bucket_versioning`, `aws_s3_bucket_server_side_encryption_configuration`, `aws_s3_bucket_public_access_block`, `aws_s3_bucket_logging`, `aws_dynamodb_table`, `aws_kms_key`
- Google Provider docs: `google_storage_bucket`
- AzureRM Provider docs: `azurerm_storage_account`, `azurerm_storage_container`
- GitHub Actions: `actions/checkout@v4`, `aws-actions/configure-aws-credentials@v4`, `hashicorp/setup-terraform@v3`

## Issues Found
No technical issues found.

All code examples are syntactically correct and use current (non-deprecated at the time of writing) APIs:

- AWS S3 bucket resources are properly split into separate resources (`aws_s3_bucket_versioning`, `aws_s3_bucket_server_side_encryption_configuration`, `aws_s3_bucket_public_access_block`) as required by AWS provider v4+.
- DynamoDB lock table uses the correct schema: `hash_key = "LockID"` with attribute `type = "S"`.
- GCS backend correctly notes native locking (Cloud Storage provides atomic operations, so no separate lock table is needed).
- Azure Blob Storage backend correctly notes native locking via blob leases.
- The Terraform Cloud `cloud` block syntax is correct (requires Terraform 1.1+).
- The `workspace_key_prefix` argument is valid for the S3 backend.
- The `terraform.workspace` named value is a valid expression in HCL.
- The IAM policy includes the correct S3 and DynamoDB actions required by the backend (Get/Put/Delete on objects, ListBucket on bucket, Get/Put/Delete on DynamoDB items).
- The KMS-encrypted S3 backend correctly uses `kms_key_id` (the documented argument name).
- The partial backend configuration via `-backend-config=<file>.hcl` is correct usage.
- The `terraform init -migrate-state` and `-reconfigure` flags are correct.
- The `terraform force-unlock` syntax is correct.
- `terraform state pull` / `terraform state push` commands are correct.
- GitHub Actions and GitLab CI examples use current action versions and valid syntax.

## Review Notes
- **S3 native locking (Terraform 1.10+/1.11+)**: As of Terraform 1.10 (Nov 2024) and especially 1.11 (Feb 2025), the S3 backend supports native state locking via `use_lockfile = true`, which removes the need for a separate DynamoDB table. The `dynamodb_table` argument is deprecated as of 1.11 but still functional. The DynamoDB-based approach shown in the post remains widely deployed and works correctly, so the post is not incorrect — just not using the newest pattern. A future revision could mention `use_lockfile` as an alternative.
- **`sse_algorithm = "aws:kms"` without a key ID**: In the bootstrap example, server-side encryption is configured with `aws:kms` but no `kms_master_key_id`. This is valid and will use the AWS-managed S3 KMS key (aws/s3). It works, but a customer-managed key (shown later in the KMS section) provides more control.
- **GitLab CI `dependencies` keyword**: Still valid, though `needs:` is the more modern keyword for stage dependencies in GitLab CI. Not an error.
- **AMI ID `ami-0c55b159cbfafe1f0`** in the workspace example is an illustrative placeholder; readers in different regions would use a region-appropriate AMI.
- **`prevent_destroy` on the bootstrap S3 bucket**: Correctly used to prevent accidental deletion of the state bucket.
- **GCS `versioning { enabled = true }` and lifecycle rule with `num_newer_versions = 5`**: Correct syntax for the google provider.
