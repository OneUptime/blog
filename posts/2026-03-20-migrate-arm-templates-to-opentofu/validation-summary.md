# Validation Summary: How to Migrate Azure Infrastructure from ARM Templates to OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Resource Manager (ARM) templates
- Azure CLI
- OpenTofu
- HCL
- AzureRM provider for OpenTofu/Terraform-compatible workflows

## Sources Consulted
- OpenTofu import documentation: https://opentofu.org/docs/language/import/
- OpenTofu `for_each` documentation: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu `tofu test` command documentation: https://opentofu.org/docs/cli/commands/test/
- Azure CLI `az deployment group` reference: https://learn.microsoft.com/en-us/cli/azure/deployment/group?view=azure-cli-latest
- Azure CLI `az group` reference: https://learn.microsoft.com/en-us/cli/azure/group?view=azure-cli-latest
- Azure CLI `az resource` reference: https://learn.microsoft.com/en-us/cli/azure/resource?view=azure-cli-latest
- Azure CLI `az storage account` reference: https://learn.microsoft.com/en-us/cli/azure/storage/account?view=azure-cli-latest
- ARM template deployment with Azure CLI: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-cli
- ARM template scope functions: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/scope-functions
- ARM template numeric functions (`copyIndex`): https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/template-functions-numeric
- ARM linked templates documentation: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/linked-templates
- Microsoft.Storage/storageAccounts template reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-05-01/storageaccounts
- AzureRM provider `azurerm_storage_account` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_account.html.markdown
- AzureRM provider `azurerm_resource_group` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/resource_group.html.markdown

## Issues Found
- The introduction said ARM templates were "tightly coupled to the Azure portal." I changed this because Microsoft documents ARM template deployment through Azure CLI and other deployment entry points, so the original wording was too narrow.
- The ARM storage account example omitted `apiVersion`, which is required in ARM resource definitions. I added `apiVersion` and an empty `properties` object so the example is a valid resource definition.
- The OpenTofu example imported `azurerm_resource_group.main` later in the post without first showing a matching `resource` block. I added the resource group block and referenced it from the storage account example because OpenTofu requires configuration for import targets before planning.
- The import workflow implied that `tofu plan` before `tofu apply` should already show no changes. I corrected this so `tofu plan` previews the import, `tofu apply` performs it, and the no-change check happens on a subsequent `tofu plan`.
- The ARM-to-OpenTofu mapping block was labeled as `hcl` even though it was not valid HCL, and it oversimplified `resourceGroup()`, `resourceId(...)`, and `copyIndex()`. I changed the block to `text` and corrected the mappings.
- The summary said `tofu plan` should show no changes during the import step and referred to "provider-agnostic patterns" in a way that could be misleading for Azure-specific `azurerm` configuration. I updated the wording to match the validated workflow more precisely.

## Review Notes
- OpenTofu's configuration-driven `import` blocks are documented as experimental in the current docs, although the workflow shown in the post is valid.
- `az deployment group export` exports the template used for a deployment record. If the goal is to capture the current resource group state rather than the original deployment template, `az group export` is a related command worth considering in a future revision.
- I could not run local `az` or `tofu` help in this workspace because neither command is installed here, so command validation relied on the official documentation above.
