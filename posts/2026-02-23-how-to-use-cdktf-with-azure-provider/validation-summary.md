# Validation Summary: How to Use CDKTF with Azure Provider

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CDK for Terraform (CDKTF)
- Terraform AzureRM provider
- Azure CLI
- TypeScript
- Azure Resource Groups
- Azure Virtual Network, Subnets, and Network Security Groups
- Azure App Service
- Azure SQL Database
- Azure Storage Accounts and Blob Containers
- Azure Kubernetes Service (AKS)
- Azure Managed Identities and RBAC

## Sources Consulted
- HashiCorp CDKTF CLI command reference: https://developer.hashicorp.com/terraform/cdktf/cli-reference/commands
- HashiCorp CDKTF providers documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/providers
- Terraform Registry AzureRM provider documentation and features block: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Terraform Registry `azurerm_linux_web_app` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- Terraform Registry `azurerm_storage_account` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- Terraform Registry `azurerm_storage_container` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container
- Terraform Registry `azurerm_kubernetes_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- Microsoft Learn Azure CLI `az account` documentation: https://learn.microsoft.com/en-us/cli/azure/account
- Microsoft Learn service principal creation with Azure CLI: https://learn.microsoft.com/en-us/cli/azure/azure-cli-sp-tutorial-1
- Microsoft Learn AKS supported Kubernetes versions: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Learn Azure App Service Node.js configuration: https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs
- Generated TypeScript declarations from `@cdktf/provider-azurerm` 14.23.1, which maps to Terraform AzureRM provider 4.55.0

## Issues Found
- The setup used `npm install @cdktf/provider-azurerm` and package imports from `@cdktf/provider-azurerm/lib/...`. The prebuilt provider package is now deprecated, so the post now uses `cdktf provider add "azurerm@~> 4.0" --force-local` and imports from generated local bindings under `./.gen/providers/azurerm/...`.
- The resource group section said every Azure resource lives in a resource group. That is too broad, because Azure also has subscription-, management-group-, and tenant-scoped resources. Changed it to "Most Azure resources live in a resource group."
- The App Service example used Node.js `18-lts`, which is end-of-life. Updated the runtime to `24-lts`, which is listed as a valid AzureRM Linux Web App Node runtime.
- The storage account example used `enableHttpsTrafficOnly`, which is not the current CDKTF/AzureRM TypeScript property name. Updated it to `httpsTrafficOnlyEnabled`.
- The storage container example used `storageAccountName`, which AzureRM v4 marks deprecated in favor of `storage_account_id`. Updated it to `storageAccountId: storage.id`.
- The AKS example pinned Kubernetes `1.28`, which is no longer a current standard-support AKS version. Removed the explicit version so Azure can select a supported default unless the reader deliberately pins a region-supported version.
- The service principal example used lowercase `contributor`; changed it to the canonical Azure RBAC role name `Contributor`.

## Review Notes
CDKTF itself is deprecated as of December 10, 2025 according to HashiCorp documentation. The examples remain technically valid for existing CDKTF users, but future revisions should consider whether a Terraform HCL or another maintained IaC workflow is more appropriate for new projects.
