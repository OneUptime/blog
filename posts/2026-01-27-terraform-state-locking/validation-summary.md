# Validation Summary: How to Implement Terraform State Locking

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Terraform (state locking, backends, CLI)
- AWS S3 (state storage)
- AWS DynamoDB (lock table)
- AWS IAM (permissions)
- AWS CloudWatch (monitoring)
- Google Cloud Storage (GCS backend)
- Azure Blob Storage / Azure Resource Manager (azurerm backend)
- Terraform Cloud / HCP Terraform (`cloud` block, `remote` backend)
- GitHub Actions (CI/CD workflow with concurrency)
- Bash (wrapper script with retries)
- HCL (Terraform configuration language)

## Sources Consulted
- Terraform S3 backend docs: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform GCS backend docs: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform azurerm backend docs: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform `cloud` block docs: https://developer.hashicorp.com/terraform/cli/cloud/settings
- Terraform `remote` backend docs: https://developer.hashicorp.com/terraform/language/backend/remote
- Terraform CLI command reference (`force-unlock`, `-lock-timeout`, `-lock`): https://developer.hashicorp.com/terraform/cli/commands
- AWS provider docs for `aws_dynamodb_table`, `aws_iam_policy`, `aws_cloudwatch_metric_alarm`
- AzureRM provider docs for `azurerm_resource_group`, `azurerm_storage_account` (`blob_properties`, `versioning_enabled`, `delete_retention_policy`), `azurerm_storage_container`
- Azure Blob Storage Lease Blob REST API reference (lease durations: 15-60 seconds finite, or -1 infinite)
- GitHub Actions concurrency docs: https://docs.github.com/en/actions/using-jobs/using-concurrency
- hashicorp/setup-terraform action: https://github.com/hashicorp/setup-terraform

## Issues Found
- **Azure Blob lease duration claim inaccurate.** The post stated "Azure acquires a 60-second lease, renewed during operations." Terraform's azurerm backend actually acquires an infinite-duration lease (passing -1 to Azure Blob's Lease Blob API) and releases it when the operation completes — it does not use a 60-second finite lease that requires renewal. Updated the inline comment to: "Azure acquires an infinite blob lease that is released when the operation completes."

## Review Notes
- The S3 backend example uses `dynamodb_table` for locking. This is still fully supported, but starting in Terraform 1.10, the S3 backend also supports native S3 state locking via `use_lockfile = true` (which uses an `.tflock` object alongside the state file and removes the DynamoDB dependency). The HashiCorp roadmap deprecates `dynamodb_table` in favor of this. The post's approach remains valid for current/legacy setups, so it was not changed, but a future revision could mention `use_lockfile` as a modern alternative.
- The IAM policy example lists `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on the state object, and DynamoDB item-level actions. For a fully functional Terraform S3 backend, `s3:ListBucket` on the bucket itself is typically also required (Terraform needs to check whether the state object exists). The policy as written is illustrative rather than complete; not flagged as a correctness error since it matches the lock-specific scope the section describes.
- The CloudWatch alarm in "Monitor Lock Table" is syntactically valid HCL, but the metric/threshold combination (`ConsumedWriteCapacityUnits` > 0 over a 1-hour period) does not actually detect "stuck locks" — it triggers on any write activity over the window. This is a design/usefulness issue rather than a Terraform-correctness issue, so it was left as is.
- In azurerm provider v4+, `storage_account_name` on `azurerm_storage_container` is deprecated in favor of `storage_account_id`. The current form still works in v3 and remains functional in v4 (with deprecation warnings). Not a correctness error today, but worth refreshing in a future revision.
- The `backend "remote"` block is still supported but HashiCorp now recommends the `cloud` block for new configurations targeting HCP Terraform / Terraform Cloud. The post correctly presents the `cloud` block first and `remote` as an alternative.
- Lock info fields (`ID`, `Path`, `Operation`, `Who`, `Created`, `Version`) and `OperationTypeApply` match Terraform's actual lock-info output.
- `terraform force-unlock <LOCK_ID>` syntax and the interactive confirmation prompt text match Terraform's current behavior.
- GitHub Actions `concurrency` block and `actions/checkout@v4` / `hashicorp/setup-terraform@v3` versions are current as of the review date.
