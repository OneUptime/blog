# Validation Summary: How to Use Workspaces with Backend Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform backend configuration
- S3 backend
- AzureRM backend
- GCS backend
- HCP Terraform / Terraform Cloud workspaces
- Terraform remote state
- AWS S3 state bucket configuration

## Sources Consulted
- Terraform workspaces documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform backend configuration overview: https://developer.hashicorp.com/terraform/language/backend
- Terraform cloud block documentation: https://developer.hashicorp.com/terraform/language/block/terraform#cloud
- Terraform `terraform_remote_state` data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- HashiCorp AWS provider S3 bucket resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

## Issues Found
- The S3 backend examples used `dynamodb_table` as the primary state-locking configuration. Current Terraform documentation marks DynamoDB-based S3 backend locking as deprecated and recommends S3 lockfile locking with `use_lockfile`. Updated the backend snippets to use `use_lockfile = true`, removed the DynamoDB lock-table bootstrap resource, and added a short note that DynamoDB locking is now deprecated.

## Review Notes
- The workspace state paths for S3 and GCS match Terraform backend documentation. The AzureRM backend supports workspaces and uses Azure Blob Storage native locking, though the current AzureRM backend page documents the backend options more than the exact workspace blob naming convention.
- The `terraform_remote_state` example is valid for backends that support workspaces, but Terraform documentation warns that consumers of remote state need access to the full state snapshot, not only outputs.
- The backend migration section is accurate: Terraform can copy all workspaces during backend migration when multiple workspaces are detected and prompts for confirmation.
