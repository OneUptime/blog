# Validation Summary: How to Configure Terraform Backend with State Locking for Team Collaboration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform state and backends
- Terraform S3 backend
- AWS S3
- AWS IAM
- Azure Storage backend
- Google Cloud Storage backend
- Terraform workspaces
- GitHub Actions CI/CD

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- Terraform init command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform force-unlock command documentation: https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- Terraform remote state data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Azure CLI blob container documentation: https://learn.microsoft.com/en-us/azure/storage/blobs/blob-containers-cli
- Azure CLI storage account documentation: https://learn.microsoft.com/en-us/cli/azure/storage/account

## Issues Found
- The S3 backend examples used `dynamodb_table` and described DynamoDB locking as the primary S3 locking approach. Terraform's current S3 backend documentation marks DynamoDB-based locking as deprecated and recommends S3 native lockfiles through `use_lockfile = true`. Updated the section title, explanation, backend snippets, and bootstrap example to use S3 native locking.
- The state locking explanation said other operations wait until the lock releases. Terraform's default lock timeout is `0s`, so operations fail immediately unless a lock timeout is configured. Updated the explanation to reflect both failure and configured waiting behavior.
- The migration backend snippet used deprecated DynamoDB locking. Replaced it with `use_lockfile = true`.
- The lock troubleshooting command scanned DynamoDB for lock details. Updated it to reference the S3 `.tflock` object used by native S3 locking.
- The IAM policy omitted the S3 lockfile permissions required for native S3 locking, especially `s3:DeleteObject` on the `.tflock` object. Split the S3 permissions into bucket, state object, and lockfile statements with the required actions.
- The Azure backend snippet enabled Microsoft Entra ID authentication but did not specify an authentication subtype. Added `use_cli = true` to match a local Azure CLI workflow.
- The Azure CLI container creation command omitted `--auth-mode login`, which is recommended when using Microsoft Entra credentials for blob data operations. Added the flag.
- The CI example pinned Terraform `1.6.0`, which is inconsistent with the S3 native lockfile configuration. Updated it to `1.15.0` to align with the current Terraform documentation version reviewed.

## Review Notes
The `terraform_remote_state` example is technically valid, but Terraform documentation notes that consumers of remote state need access to the full state snapshot. For sensitive environments, publishing only the required outputs to a separate data store may be preferable.
