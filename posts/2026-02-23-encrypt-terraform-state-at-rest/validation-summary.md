# Validation Summary: How to Encrypt Terraform State at Rest

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform state and backends
- AWS S3 backend and AWS KMS
- Amazon S3 bucket policies
- Google Cloud Storage backend and Cloud KMS CMEK
- Azure Blob Storage backend and Azure Storage customer-managed keys
- HCP Terraform / Terraform Enterprise
- Linux LUKS, macOS FileVault disk images, and SOPS

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- HashiCorp Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- AWS S3 bucket policy examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html
- AWS S3 server-side encryption documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingServerSideEncryption.html
- AWS KMS key rotation documentation: https://docs.aws.amazon.com/kms/latest/developerguide/rotating-keys-enable.html
- Google Cloud SDK `gcloud kms keys create` documentation: https://cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Google Cloud Storage CMEK documentation: https://docs.cloud.google.com/storage/docs/encryption/using-customer-managed-keys
- Terraform AzureRM `azurerm_storage_account` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- Terraform AzureRM `azurerm_storage_account_customer_managed_key` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_customer_managed_key
- Microsoft Azure Storage encryption documentation: https://learn.microsoft.com/en-us/azure/storage/common/storage-service-encryption
- Microsoft Azure Storage customer-managed key documentation: https://learn.microsoft.com/en-us/azure/storage/common/customer-managed-keys-overview
- SOPS documentation: https://sops.pages.dev/

## Issues Found
- The S3 backend examples used `dynamodb_table`, which HashiCorp now marks deprecated for S3 backend state locking. Replaced it with `use_lockfile = true`.
- The GCS backend example described a customer-managed Cloud KMS key but used `encryption_key`, which is for customer-supplied keys. Changed it to `kms_encryption_key`.
- The GCS CMEK setup commands omitted the Cloud Storage service agent authorization required to use the KMS key. Added `gcloud storage service-agent --authorize-cmek ...`.
- The Azure Storage account example used the superseded `enable_https_traffic_only` argument. Updated it to `https_traffic_only_enabled`.
- The Azure customer-managed key resource used older `key_vault_id` and `key_name` arguments. Updated it to the current `key_vault_key_id` argument.
- The S3 encryption-in-transit example used `skip_metadata_api_check = false`, which controls EC2 metadata checks rather than HTTPS/TLS behavior. Replaced it with `insecure = false` and corrected the comment.
- The S3 bucket policy explanation said it prevented unencrypted state. Adjusted the wording to clarify that the policy enforces the required KMS encryption settings.

## Review Notes
Terraform CLI was not installed in the local environment, so HCL snippets were reviewed against official documentation rather than validated with `terraform init` or `terraform validate`.
