# Validation Summary: How to Use tofu force-unlock to Release State Locks - Tofu State Locks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu state locking
- OpenTofu S3, AzureRM, and local backends
- AWS DynamoDB and AWS CLI
- Azure Blob Storage leases and Azure CLI
- Bash and jq

## Sources Consulted
- OpenTofu force-unlock command documentation: https://opentofu.org/docs/cli/commands/force-unlock/
- OpenTofu state locking documentation: https://opentofu.org/docs/language/state/locking/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu AzureRM backend documentation: https://opentofu.org/docs/language/settings/backends/azurerm/
- OpenTofu local backend documentation: https://opentofu.org/docs/language/settings/backends/local/
- OpenTofu statemgr filesystem source documentation: https://pkg.go.dev/github.com/opentofu/opentofu@v1.11.5/internal/states/statemgr
- OpenTofu S3 backend source: https://github.com/opentofu/opentofu/blob/v1.11.5/internal/backend/remote-state/s3/client.go
- AWS CLI DynamoDB scan command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/scan.html
- AWS CLI DynamoDB delete-item command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/delete-item.html
- Azure CLI storage blob lease command reference: https://learn.microsoft.com/en-us/cli/azure/storage/blob/lease
- Azure Blob Storage Lease Blob REST API documentation: https://learn.microsoft.com/en-us/rest/api/storageservices/lease-blob

## Issues Found
- The sample S3 lock info path used `s3://my-bucket/prod/terraform.tfstate`, but OpenTofu's S3 backend stores the lock path as `bucket/key` and uses that same value as the DynamoDB `LockID` partition key. I changed the example path to `my-bucket/prod/terraform.tfstate`.
- The local backend example included `rm terraform.tfstate.lock.info`, but OpenTofu's filesystem state manager creates hidden lock metadata named `.<state-file>.lock.info`; for the default `terraform.tfstate` path, that is `.terraform.tfstate.lock.info`. I removed the incorrect non-hidden filename and clarified that local backend locking also uses OS file locking, so the OpenTofu process must be stopped first.
- The stale-lock detection script attempted to parse `.Info.S` for every DynamoDB item. The S3 backend can also store non-lock digest rows such as `-md5` items that do not have `Info`, which would make the jq filter fail. I updated the jq filter to skip items without `Info.S`.
- The stale-lock detection script generated a UTC cutoff without the trailing `Z`. I updated the timestamp format to RFC3339-style UTC so it matches OpenTofu lock metadata more closely.

## Review Notes
- `tofu force-unlock [options] LOCK_ID` and the `-force` option are current and correctly described.
- The S3 + DynamoDB commands use the correct DynamoDB table key shape for OpenTofu's `dynamodb_table` locking mode. Current OpenTofu also supports native S3 lock files with `use_lockfile=true`; DynamoDB locking remains supported.
- AzureRM backend state locking uses Azure Blob Storage native capabilities, and the Azure CLI lease break command shown uses current parameters.
- If a backend configuration or encryption block uses root module variables, `tofu force-unlock` may also need the same variable values via `-var`, `-var-file`, or other supported variable assignment methods.
