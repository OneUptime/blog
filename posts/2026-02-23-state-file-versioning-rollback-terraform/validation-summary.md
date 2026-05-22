# Validation Summary: How to Use State File Versioning for Rollback

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform state and remote backends
- Amazon S3 object versioning and AWS CLI
- Google Cloud Storage object versioning and gsutil
- Azure Blob Storage versioning and Azure CLI
- Terraform AWS, Google, and AzureRM providers

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform `state push` command documentation: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform AWS provider `aws_s3_bucket_lifecycle_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform Google provider `google_storage_bucket` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Terraform AzureRM provider `azurerm_storage_account` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- AWS CLI `s3api list-object-versions` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html
- AWS CLI `s3api get-object` documentation: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/s3api/get-object.html
- Google Cloud Storage Object Versioning documentation: https://cloud.google.com/storage/docs/object-versioning
- Google Cloud Storage versioned object usage documentation: https://cloud.google.com/storage/docs/using-versioned-objects
- Azure Blob Storage versioning documentation: https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview
- Azure CLI `az storage blob` documentation: https://learn.microsoft.com/en-us/cli/azure/storage/blob

## Issues Found
- The rollback commands used `terraform state push` without accounting for Terraform's higher-remote-serial safety check. Older state snapshots normally have lower serial numbers than the current remote state, so the command can fail during the rollback workflow. Updated rollback examples and the reusable script to use `terraform state push -force`, and added a warning explaining why it is required and when to use it.
- The S3 lifecycle example said the bucket was created with versioning enabled in the `aws_s3_bucket` resource, but versioning is actually configured in `aws_s3_bucket_versioning`. Updated the comment for accuracy.
- The S3 lifecycle configuration had no explicit dependency on the versioning resource. Added `depends_on = [aws_s3_bucket_versioning.terraform_state]` to match provider guidance that lifecycle rules for noncurrent versions should be applied after bucket versioning is enabled.
- The S3 lifecycle example claimed it would keep at least 10 versions regardless of age, but the snippet only transitioned noncurrent versions after 30 days and expired them after 90 days. Removed the inaccurate comment.

## Review Notes
- Terraform CLI, AWS CLI, and Azure CLI binaries were not installed in the local environment, so command behavior was verified against official documentation rather than local `--help` output.
- `gsutil` commands remain technically valid for versioned GCS objects, though Google documentation now generally points users toward `gcloud storage` for newer workflows.
