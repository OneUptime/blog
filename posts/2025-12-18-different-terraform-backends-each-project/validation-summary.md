# Validation Summary: How to Use Different Terraform Backends for Each Project

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform backend configuration
- Terraform S3 backend
- Terraform AzureRM backend
- Terraform workspaces
- AWS S3
- AWS KMS bucket encryption
- GitHub Actions CI/CD

## Sources Consulted
- HashiCorp Terraform backend configuration overview: https://developer.hashicorp.com/terraform/language/backend
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- HashiCorp setup-terraform GitHub Action README: https://github.com/hashicorp/setup-terraform
- HashiCorp AWS Provider Registry documentation for S3 bucket versioning, public access block, and server-side encryption resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The S3 backend examples used `dynamodb_table` for state locking. Terraform's current S3 backend documentation marks DynamoDB-based locking as deprecated and recommends S3 lockfiles. Replaced `dynamodb_table` with `use_lockfile = true` in S3 backend configuration examples.
- The wrapper script and environment configuration used `TF_BACKEND_DYNAMODB_TABLE`. Removed that variable and the corresponding `-backend-config` argument because S3 lockfiles do not require a DynamoDB table.
- The Project C Azure backend config was shown next to an S3 backend block. Backend config files cannot change the backend type; the root module must declare the backend type. Added a minimal `backend "azurerm"` block for Project C.
- The bootstrap module created DynamoDB lock tables for each project. Removed the DynamoDB table resource and changed the output to include `use_lockfile = true`.
- The CI example pinned Terraform `1.6.0`, which does not align with the S3 lockfile examples. Updated it to Terraform `1.11.0`, where S3 native locking is available as a stable feature.
- The CI example used `hashicorp/setup-terraform@v3`; current official examples use `@v4`. Updated the action reference to `hashicorp/setup-terraform@v4`.
- The best-practice item said to always configure DynamoDB or equivalent for state locking. Updated it to recommend S3 lockfiles for S3 backends or the equivalent locking mechanism for other backends.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was checked against official Terraform documentation instead of local `terraform --help` output.
