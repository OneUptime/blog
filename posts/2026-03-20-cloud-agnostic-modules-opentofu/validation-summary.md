# Validation Summary: How to Write Cloud-Agnostic Modules with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS S3
- Amazon EC2 instance types
- Azure Resource Manager
- Azure Blob Storage
- Azure virtual machine sizes
- Google Cloud Storage

## Sources Consulted
- OpenTofu Module Blocks: https://opentofu.org/docs/language/modules/syntax/
- OpenTofu Module Sources: https://opentofu.org/docs/language/modules/sources/
- OpenTofu `init` command: https://opentofu.org/docs/cli/commands/init/
- OpenTofu count Meta-Argument: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu replace Function: https://opentofu.org/docs/language/functions/replace/
- AWS provider `aws_s3_bucket`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- AWS provider `aws_s3_bucket_versioning`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- AzureRM provider `azurerm_resource_group`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group
- AzureRM provider `azurerm_storage_account`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- AzureRM provider `azurerm_storage_container`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container
- Google provider `google_storage_bucket`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Amazon EC2 general purpose instance specifications: https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html
- Azure Bv1 size series: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/bv1-series
- Azure Dsv3 size series: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dsv3-series
- Google Cloud Storage bucket locations: https://cloud.google.com/storage/docs/locations

## Issues Found
- The Azure object-storage example created only an `azurerm_storage_account`, which is not the bucket/container-level Blob Storage resource described by the post. I added `azurerm_storage_container` and updated the outputs so the Azure branch now returns the container name and ID.
- The Azure example referenced `var.azure_resource_group`, but that variable was not declared in the module interface. I replaced that dependency with an internal `azurerm_resource_group` so the example keeps a provider-neutral input surface.
- Azure storage account names must use lowercase alphanumeric characters. I normalized the derived storage account name with `lower(...)` to keep the example aligned with provider requirements.

## Review Notes
- OpenTofu currently supports locals and variables in module `source` and `version` fields, so the conditional `source` example is valid for OpenTofu specifically. The selected value still needs to be resolvable during `tofu init`.
- The single-module `count` pattern is valid, but it still couples the module to the provider schemas it references. The separate per-cloud module pattern remains the cleaner long-term approach.
