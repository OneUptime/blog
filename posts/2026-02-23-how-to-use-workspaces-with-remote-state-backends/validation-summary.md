# Validation Summary: How to Use Workspaces with Remote State Backends

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform remote state backends
- Amazon S3 backend
- AzureRM backend
- Google Cloud Storage backend
- Consul backend
- PostgreSQL backend
- AWS IAM and S3 bucket policies

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform Consul backend documentation: https://developer.hashicorp.com/terraform/language/backend/consul
- Terraform PostgreSQL backend documentation: https://developer.hashicorp.com/terraform/language/backend/pg
- Terraform workspaces documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- Terraform CLI workspaces documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform backend source for AzureRM workspace paths: https://github.com/hashicorp/terraform/blob/main/internal/backend/remote-state/azure/backend_state.go
- Terraform backend source for GCS workspace and lock paths: https://github.com/hashicorp/terraform/blob/main/internal/backend/remote-state/gcs/backend_state.go
- Terraform backend source for Consul workspace paths and locking: https://github.com/hashicorp/terraform/blob/main/internal/backend/remote-state/consul/backend_state.go

## Issues Found
- The S3 examples used `dynamodb_table` for state locking. Terraform's current S3 backend documentation marks DynamoDB-based locking as deprecated and recommends S3 lock files via `use_lockfile`. Updated the S3 backend examples and locking explanation to use `use_lockfile = true` and `.tflock` objects.
- The S3 IAM policy example omitted `s3:ListBucket`, which Terraform requires for workspace discovery. Updated the policy to include list permissions scoped by workspace prefix.
- The S3 locking troubleshooting note referred to a lock table or mechanism. Updated it to refer to the lock file or mechanism so it matches the current S3 lock-file example.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was checked against official documentation and Terraform backend source instead of local `terraform --help` output. AzureRM workspace blob naming, GCS workspace file naming, Consul workspace key naming, and PostgreSQL state table behavior matched the official documentation or backend implementation.
