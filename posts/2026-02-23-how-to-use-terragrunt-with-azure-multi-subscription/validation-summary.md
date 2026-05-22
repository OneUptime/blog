# Validation Summary: How to Use Terragrunt with Azure Multi-Subscription

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terragrunt
- Azure Resource Manager
- Azure subscriptions and resource groups
- Azure Blob Storage Terraform state backend
- AzureRM Terraform provider
- Azure Kubernetes Service (AKS)
- Azure DevOps pipelines

## Sources Consulted
- Terragrunt HCL Blocks documentation: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt HCL Functions documentation: https://docs.terragrunt.com/reference/hcl/functions/
- Terraform azurerm backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform provider configuration documentation: https://developer.hashicorp.com/terraform/language/providers/configuration
- Terraform providers within modules documentation: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- AzureRM Kubernetes cluster resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- AKS supported Kubernetes versions: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Azure storage account overview and naming rules: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview
- Azure Resource Manager overview: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/overview

## Issues Found

1. **Example Azure IDs were not valid GUID-shaped values.** The tenant ID used non-hexadecimal characters, and the prod subscription ID used non-hexadecimal placeholder groups. Updated the examples to valid GUID-shaped placeholders.

2. **The AKS example used Kubernetes `1.28`, which is no longer a current supported AKS version as of May 22, 2026.** Updated the example to `1.35`, which is listed in the current AKS supported version table.

3. **The cross-subscription dependency example referenced `shared/eastus/hub-vnet`, but the directory tree did not include that module.** Added `hub-vnet/terragrunt.hcl` under the shared subscription's `eastus` directory.

4. **The cross-subscription provider example referenced undefined Terragrunt locals.** Added a `locals` block that reads the dev and shared subscription configs and exposes the subscription and tenant IDs used by the generated provider blocks.

5. **The VNet peering module example omitted Terraform's provider alias requirements.** Added a `required_providers` example with `configuration_aliases = [azurerm.hub, azurerm.spoke]` and clarified that resources in the module must select the appropriate provider alias.

## Review Notes
- The state storage account naming pattern is syntactically valid and meets Azure's lowercase alphanumeric length rules, but in a production system teams should still check global uniqueness and create the backend storage account/container before Terraform initializes the remote backend.
- The Azure DevOps snippet uses client secret authentication because that matches the post's service-principal section. HashiCorp currently recommends OpenID Connect / workload identity federation over client secrets for new Azure backend authentication where possible.
