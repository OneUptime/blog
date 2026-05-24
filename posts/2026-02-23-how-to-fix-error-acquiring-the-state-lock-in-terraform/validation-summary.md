# Validation Summary: How to Fix Error Acquiring the State Lock in Terraform

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Terraform (state locking, force-unlock, lock-timeout)
- AWS S3 + DynamoDB backend (state locking via DynamoDB conditional writes)
- Azure Blob Storage backend (lease-based locking)
- Google Cloud Storage (GCS) backend (object generation locking)
- GitHub Actions (concurrency controls, job timeouts)
- GitLab CI (resource_group, timeout)
- Bash scripting (signal handling with trap)
- AWS CLI (`aws dynamodb get-item`, `delete-item`, `scan`)
- Azure CLI (`az storage blob lease break`)
- gsutil
- jq

## Sources Consulted
- Terraform CLI documentation — `terraform force-unlock` and `-lock-timeout`: https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- Terraform S3 backend docs (DynamoDB locking): https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform GCS backend source/docs — lock file uses `<prefix>/<workspace>.tflock`: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform azurerm backend docs (blob lease locking): https://developer.hashicorp.com/terraform/language/backend/azurerm
- AWS CLI DynamoDB reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/
- Azure CLI `az storage blob lease break`: https://learn.microsoft.com/en-us/cli/azure/storage/blob/lease
- GitHub Actions concurrency: https://docs.github.com/en/actions/using-jobs/using-concurrency
- GitLab CI resource_group: https://docs.gitlab.com/ee/ci/yaml/#resource_group

## Issues Found
1. **GCS lock file extension was incorrect.** The post stated `gsutil rm gs://terraform-state/prod/terraform.tfstate.lock`, appending `.lock` to the state filename. Terraform's GCS backend actually stores its lock object using the `.tflock` extension following the workspace-based pattern (`<prefix>/<workspace>.tflock`, e.g. `default.tflock` for the default workspace). Updated the command to `gsutil rm gs://terraform-state/prod/default.tflock` and added a comment clarifying the naming convention.

## Review Notes
- The DynamoDB `LockID` example (`terraform-state/prod/terraform.tfstate`) follows the `<bucket>/<key>` format used by the S3 backend. Note that the S3 backend also writes a separate digest item with `LockID = <bucket>/<key>-md5`; only the lock item (not the digest) needs to be removed for unlocking, so the example is correct.
- The `terraform force-unlock` confirmation prompt text shown in the post matches the real CLI output (including the typo "may be still be in use" which is present in upstream Terraform).
- The Azure CLI `az storage blob lease break` command and flags (`--account-name`, `--container-name`, `--blob-name`) are correct.
- The `trap 'kill -TERM $PID' TERM INT` pattern in the wrapper script is functional but a slightly more robust pattern would forward the original signal and then `wait` again to capture the actual exit code after signal handling. The shown approach is acceptable for the article's scope.
- Terraform 1.7.4 referenced in the example output is a real released version (Feb 2024), which is consistent with the post's 2026 timeframe as an older but realistic version.
