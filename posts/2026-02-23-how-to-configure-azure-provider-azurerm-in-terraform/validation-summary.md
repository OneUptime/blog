# Validation Summary: How to Configure Azure Provider (AzureRM) in Terraform

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Microsoft Azure
- Azure CLI
- Azure Blob Storage Terraform backend
- HCL provider and backend configuration

## Sources Consulted
- HashiCorp Terraform Registry, AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- HashiCorp Terraform Registry, AzureRM provider features block documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/features-block
- HashiCorp Terraform Registry, AzureRM 4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- HashiCorp Terraform language documentation, version constraints: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- HashiCorp Terraform backend documentation, AzureRM backend: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Microsoft Learn, Azure CLI `az login`: https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli
- Microsoft Learn, Azure CLI `az group create`: https://learn.microsoft.com/en-us/cli/azure/group
- Microsoft Learn, Azure CLI `az storage account create`: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn, Azure CLI `az storage container create`: https://learn.microsoft.com/en-us/cli/azure/storage/container

## Issues Found
- The basic provider example labeled `subscription_id` as optional, and the Azure CLI authentication section said no additional configuration was needed beyond `az login`. For AzureRM 4.x, `subscription_id` must be specified in the provider block or through `ARM_SUBSCRIPTION_ID`, so the text and example were updated.
- The `api_management` features example used `recover_soft_deleted`, which is not the AzureRM feature-block argument name. It was changed to `recover_soft_deleted_api_managements`.
- The Key Vault feature-block comment said `purge_soft_delete_on_destroy` purges soft-deleted keys, secrets, and certificates. That specific setting controls soft-deleted Key Vault resources, so the comment was corrected.

## Review Notes
Terraform and Azure CLI were not installed in the local workspace, so examples could not be executed locally. The snippets and commands were reviewed against official HashiCorp and Microsoft documentation instead.
