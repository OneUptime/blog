# Validation Summary: How to Use Multi-Cloud State Backends in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (state backends, partial backend configuration, `terraform_remote_state`)
- AWS S3 backend (with DynamoDB locking)
- AWS provider resources (`aws_s3_bucket`, `aws_s3_bucket_versioning`, `aws_dynamodb_table`)
- Azure Blob Storage backend (`azurerm`) with OIDC
- Google Cloud Storage backend (`gcs`)
- Azure CLI (`az group`, `az storage account`, `az storage container`)
- gsutil (`mb`, `versioning`, `uniformbucketlevelaccess`)
- HCL syntax

## Sources Consulted
- OpenTofu S3 backend docs: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu azurerm backend docs: https://opentofu.org/docs/language/settings/backends/azurerm/
- OpenTofu gcs backend docs: https://opentofu.org/docs/language/settings/backends/gcs/
- OpenTofu `terraform_remote_state` data source docs
- AWS Terraform provider docs for `aws_s3_bucket_versioning` (separated resource pattern, AWS provider v4+)
- Azure CLI reference for `az storage account create`
- Google Cloud `gsutil` reference

## Issues Found
No technical issues found.

All HCL backend configurations use correct field names. The S3 backend's `dynamodb_table` is still fully supported (OpenTofu has no plans to deprecate it, even after `use_lockfile` was added in 1.10). The `azurerm` backend fields including `use_oidc` are valid. The `gcs` backend `bucket`/`prefix` fields are canonical. Azure CLI flags (`--sku Standard_LRS`, `--encryption-services blob`, `--allow-blob-public-access`) are all valid. gsutil commands are syntactically correct. The `aws_s3_bucket_versioning` separated-resource pattern is the required approach since AWS provider v4.0. The `terraform_remote_state` data source with `backend = "s3"` is supported.

## Review Notes
- gsutil is being gradually superseded by `gcloud storage` commands, but the legacy gsutil commands shown still work and are widely used. Not an error.
- OpenTofu 1.10+ supports native S3 state locking via `use_lockfile = true` as an alternative to DynamoDB. The post sticks with the DynamoDB approach, which remains fully supported and is appropriate for users on older OpenTofu versions or those already invested in DynamoDB-based locking.
- For Azure, `use_azuread_auth = true` is often paired with `use_oidc = true` in modern setups, but the post's configuration is valid as-is.
