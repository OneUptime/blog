# Validation Summary: OpenTofu vs Azure Bicep: Choosing the Right IaC Tool for Azure

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- OpenTofu (HCL, AzureRM provider)
- Azure Bicep DSL
- Azure Resource Manager (ARM)
- Azure CLI (`az deployment group create`)
- Azure Kubernetes Service (AKS)
- Azure Storage Accounts
- Azure Policy
- Azure Blob Storage backend (OpenTofu state)

## Sources Consulted
- OpenTofu documentation: https://opentofu.org/docs/
- AzureRM Terraform provider docs (v4.x):
  - `azurerm_storage_account`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
  - `azurerm_kubernetes_cluster`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
  - `azurerm` backend: https://developer.hashicorp.com/terraform/language/settings/backends/azurerm
- Azure Bicep documentation: https://learn.microsoft.com/azure/azure-resource-manager/bicep/
- ARM resource references:
  - `Microsoft.Storage/storageAccounts`: https://learn.microsoft.com/azure/templates/microsoft.storage/storageaccounts
  - `Microsoft.ContainerService/managedClusters`: https://learn.microsoft.com/azure/templates/microsoft.containerservice/managedclusters
  - `Microsoft.Resources/resourceGroups`: https://learn.microsoft.com/azure/templates/microsoft.resources/resourcegroups
  - `Microsoft.Authorization/policyDefinitions`: https://learn.microsoft.com/azure/templates/microsoft.authorization/policydefinitions
- Azure CLI `az deployment group create`: https://learn.microsoft.com/cli/azure/deployment/group

## Issues Found
- The OpenTofu storage account example uses the AzureRM v4.x property name `https_traffic_only_enabled`, but the AKS example used the deprecated v3.x name `enable_auto_scaling`. To make the schema consistent with the v4 provider used elsewhere in the post (and current at the time of writing), updated the `default_node_pool` argument to `auto_scaling_enabled`.

## Review Notes
- The Bicep API versions referenced (`Microsoft.Storage/storageAccounts@2023-01-01`, `Microsoft.ContainerService/managedClusters@2023-07-01`, `Microsoft.Resources/resourceGroups@2021-04-01`, `Microsoft.Authorization/policyDefinitions@2021-06-01`) are valid and stable. Newer API versions exist; readers may prefer to bump them, but the current ones are not deprecated.
- The Bicep `supportsHttpsTrafficOnly` and `minimumTlsVersion` properties on `Microsoft.Storage/storageAccounts` are correct for the referenced API version.
- The `provider "azurerm" { ... }` shorthand elides the (required) `features {}` block. Acceptable as illustrative shorthand in the post's context.
- The `tofu test` command is available in OpenTofu 1.6+ and is the correct testing entry point.
- Azure Deployment Stacks reference is accurate; this is a Bicep/ARM-only feature.
