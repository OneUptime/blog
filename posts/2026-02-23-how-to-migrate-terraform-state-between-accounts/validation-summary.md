# Validation Summary: How to Migrate Terraform State Between Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI state commands and backend migration
- Terraform S3, AzureRM, and GCS backends
- AWS S3, IAM, and S3 backend locking
- Azure CLI and Azure Storage
- Google Cloud Storage and gsutil

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- HashiCorp Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- HashiCorp Terraform `state push` command documentation: https://developer.hashicorp.com/terraform/cli/commands/state/push
- AWS CLI `s3api create-bucket` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html
- AWS CLI `dynamodb create-table` command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html
- Microsoft Azure CLI `az storage account` documentation: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Azure CLI `az storage container` documentation: https://learn.microsoft.com/en-us/cli/azure/storage/container
- Google Cloud documentation for storing Terraform state in Cloud Storage: https://docs.cloud.google.com/docs/terraform/resource-management/store-state

## Issues Found
- The AWS S3 backend examples used top-level `role_arn` for cross-account access. Current Terraform S3 backend documentation uses the `assume_role` configuration object with `role_arn` inside it, so the backend and `terraform_remote_state` snippets were updated accordingly.
- The AWS backend setup created a DynamoDB table and configured `dynamodb_table` for locking. Terraform now documents S3 native lock files with `use_lockfile = true`, while DynamoDB-based locking is deprecated and planned for removal in a future minor version. The setup and backend snippets were updated to use `use_lockfile`.
- The cross-account IAM policy still granted DynamoDB lock-table permissions. Since the example now uses S3 lock files, the policy was updated to include the documented S3 permissions for the state object and its `.tflock` lock file.

## Review Notes
- Local `terraform` and `aws` binaries were not installed in the review environment, so Terraform and AWS CLI syntax was checked against official documentation rather than local `--help` output.
- The Azure and GCP examples are broadly correct for backend migration workflows. In production, Azure Storage container creation may need explicit authentication options such as `--auth-mode login` depending on the account configuration and CLI login context.
