# Validation Summary: How to Migrate Terraform State Between Backends

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform backends
- Terraform state migration
- Terraform CLI
- AWS S3 backend
- Azure Blob Storage backend
- Google Cloud Storage backend
- HCP Terraform
- AWS CLI
- AzureRM and AWS Terraform provider resources

## Sources Consulted
- Terraform backend block configuration overview: https://developer.hashicorp.com/terraform/language/backend
- Terraform `init` command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform local backend documentation: https://developer.hashicorp.com/terraform/language/backend/local
- Terraform `cloud` block reference: https://developer.hashicorp.com/terraform/language/block/terraform
- HCP Terraform CLI integration and state migration documentation: https://developer.hashicorp.com/terraform/cli/cloud/settings
- HCP Terraform state migration tutorial: https://developer.hashicorp.com/terraform/tutorials/cloud/cloud-migrate
- Microsoft Learn, Store Terraform state in Azure Storage: https://learn.microsoft.com/en-us/azure/developer/terraform/store-state-in-azure-storage

## Issues Found
- The S3 backend examples used `dynamodb_table` for locking. Terraform's current S3 backend documentation marks DynamoDB-based locking as deprecated and recommends S3-native lock files with `use_lockfile = true`, so the S3 backend snippets were updated accordingly.
- The locking section showed DynamoDB scan and delete commands for S3 locking. This was changed to check and remove the S3 `.tflock` object used by S3-native locking, with a note to remove it only if `terraform force-unlock` cannot release it.
- The multiple-workspace migration loop selected each workspace and reran `terraform init -migrate-state`. Terraform documents that backend migration can prompt to copy multiple workspace states during reinitialization, so the loop was replaced with a single `terraform init -migrate-state` after listing workspaces.
- The destination backend setup example created a DynamoDB table for S3 locking. Because DynamoDB locking is deprecated, the DynamoDB resource was removed and the setup wording now says to create the S3 bucket first.

## Review Notes
- The local, AzureRM, GCS, and HCP Terraform backend examples match the current documented configuration shape. The AzureRM backend has several authentication modes; the snippet remains valid as a minimal backend shape but real deployments should choose an authentication method appropriate for their environment.
- Terraform CLI was not installed in the local environment, so CLI behavior was verified against official Terraform documentation rather than local `terraform --help` output.
