# Validation Summary: How to Delete Terraform State File Safely

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Terraform (state management commands: `state list`, `state show`, `state pull`, `state push`, `import`, `destroy`, `init`)
- AWS S3 (backend storage)
- AWS DynamoDB (state locking)
- AWS CLI (`aws s3`, `aws s3api`, `aws dynamodb`)
- Google Cloud Storage / `gsutil` (GCS backend)
- Azure Blob Storage / `az storage blob` (azurerm backend)
- Bash scripting / `jq`

## Sources Consulted
- Terraform CLI documentation — State commands: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform S3 backend documentation (including DynamoDB locking): https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform `import` command: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform `state push` command: https://developer.hashicorp.com/terraform/cli/commands/state/push
- AWS CLI S3 reference: https://docs.aws.amazon.com/cli/latest/reference/s3/ and s3api: https://docs.aws.amazon.com/cli/latest/reference/s3api/
- AWS CLI DynamoDB `delete-item`: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/delete-item.html
- gsutil rm reference (incl. `-a` for all versions): https://cloud.google.com/storage/docs/gsutil/commands/rm
- Azure CLI `az storage blob` reference: https://learn.microsoft.com/en-us/cli/azure/storage/blob

## Issues Found
No technical issues found.

Verified specifically:
- `terraform state pull` writes JSON state to stdout — redirecting to a file is the correct backup pattern.
- For the S3 backend with DynamoDB, the persistent digest entry uses LockID `<bucket>/<key>-md5`, which matches the post's example.
- `az storage blob lease break` correctly uses `--blob-name` (whereas `az storage blob delete` uses `--name`), as shown in the post.
- For the GCS backend, state objects are stored at `<prefix>/<workspace>.tfstate`; using `default.tfstate` for the default workspace is correct.
- `gsutil rm -a` correctly removes all noncurrent versions of an object in a versioned bucket.
- `terraform.tfstate.backup` and `.terraform.lock.hcl` are accurate references to Terraform-managed local artifacts.

## Review Notes
- When restoring state with `terraform state push`, Terraform will reject the push if the backup's serial is less than or behind the remote state's serial — users may need `-force` (or to manually adjust the serial) in real-world recovery scenarios. The post does not mention this caveat, but the command shown is technically correct as written.
- The S3+DynamoDB lock table can hold two entries during an operation: the transient lock entry (`<bucket>/<key>`) and the persistent digest entry (`<bucket>/<key>-md5`). The post only cleans up the digest entry, which is the one that actually persists outside of in-flight operations — this is appropriate.
- The standalone `terraform init -backend-config=...` in the ephemeral-environment script omits `region` and `dynamodb_table`; it works as a partial illustration but users will likely need more flags depending on their backend config.
- `terraform import` block syntax (Terraform 1.5+) is an alternative to the CLI `terraform import` command shown, but the CLI form remains fully supported.
