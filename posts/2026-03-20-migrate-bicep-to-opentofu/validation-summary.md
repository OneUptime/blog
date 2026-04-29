# Validation Summary: How to Migrate Azure Infrastructure from Bicep to OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Bicep
- OpenTofu
- Azure Resource Manager (ARM)
- Azure CLI
- AzureRM provider
- AzAPI provider
- Azure Storage Accounts
- Azure App Service

## Sources Consulted
- Microsoft Learn: `az deployment group` CLI reference - https://learn.microsoft.com/en-us/cli/azure/deployment/group?view=azure-cli-latest
- Microsoft Learn: `az resource` CLI reference - https://learn.microsoft.com/en-us/cli/azure/resource?view=azure-cli-latest
- Microsoft Learn: `az storage account` CLI reference - https://learn.microsoft.com/en-us/cli/azure/storage/account?view=azure-cli-lts
- Microsoft Learn: `az bicep` CLI reference - https://learn.microsoft.com/en-us/cli/azure/bicep?view=azure-cli-latest
- Microsoft Learn: Decompile a JSON Azure Resource Manager template to Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/decompile
- Microsoft Learn: Microsoft.Storage/storageAccounts@2023-01-01 reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-01-01/storageaccounts
- Microsoft Learn: Reference existing resources in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/existing-resource
- Microsoft Learn: Parameters in Bicep files - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/parameters
- Microsoft Learn: Overview of the Terraform AzAPI provider - https://learn.microsoft.com/en-us/azure/developer/terraform/azapi/overview-azapi-provider
- OpenTofu docs: Import - https://opentofu.org/docs/language/import/
- OpenTofu docs: Module Blocks - https://opentofu.org/docs/language/modules/syntax/
- OpenTofu docs: Input Variables - https://opentofu.org/docs/language/values/variables/
- AzureRM provider docs: `azurerm_storage_account` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_account.html.markdown
- AzureRM provider docs: `azurerm_service_plan` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/service_plan.html.markdown
- AzureRM provider docs: `azurerm_linux_web_app` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/linux_web_app.html.markdown

## Issues Found
- The post said the AzureRM provider "covers all the same resources." That is not accurate. Microsoft documents AzAPI as the provider for unsupported or preview Azure resource types, so I updated the sentence to recommend AzAPI for gaps.
- The OpenTofu storage account example referenced `azurerm_resource_group.main.name` without defining that resource and hard-coded `location = "eastus"`, which made the example inconsistent with an import-based migration. I updated the snippet to use explicit `resource_group_name` and `location` variables.
- The `tofu plan` comment implied the initial plan should be a no-op. OpenTofu documents that `import` blocks are processed during planning, so I changed the comment to say to review import actions and verify there are no destructive changes.
- The cleanup step described `az deployment group delete` as deleting the deployment record. Microsoft documents this in the context of removing deployments from deployment history, so I updated the wording to refer to deployment history entries while keeping the note that resources are retained.
- The introduction claimed the migration imports existing resources "without disruption" unconditionally. I softened this to the technically accurate condition that the imported configuration must match what is already deployed to avoid follow-up changes.

## Review Notes
- The Bicep example uses `Microsoft.Storage/storageAccounts@2023-01-01`. This API version is still valid on Microsoft Learn, but it is not the latest available version.
- OpenTofu documents configuration-driven import with `import` blocks and notes that some import-planning and configuration-generation details are experimental. The post's import-block usage remains valid.
