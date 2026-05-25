# Validation Summary: How to Create Azure Resource Groups in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- HashiCorp AzureAD provider
- Azure Resource Groups
- Azure management locks
- Azure RBAC role assignments
- Azure Policy assignments
- Azure Consumption budgets

## Sources Consulted
- HashiCorp Terraform AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- HashiCorp Terraform `azurerm_resource_group` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group
- HashiCorp Terraform `azurerm_management_lock` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/management_lock
- HashiCorp Terraform `azurerm_role_assignment` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- HashiCorp Terraform `azurerm_resource_group_policy_assignment` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group_policy_assignment
- HashiCorp Terraform `azurerm_consumption_budget_resource_group` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/consumption_budget_resource_group
- HashiCorp Terraform AzureAD `azuread_group` data source documentation: https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/group
- Microsoft Learn, Azure Resource Manager overview: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/overview
- Microsoft Learn, manage resource groups: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/manage-resource-groups-portal
- Microsoft Learn, Azure naming and tagging decision guide: https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming-and-tagging-decision-guide
- Microsoft Learn, Azure resource abbreviation recommendations: https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations

## Issues Found
- The post claimed every Azure resource lives inside a resource group. Microsoft documents exceptions for resources deployed at subscription, management group, or tenant scope, so the opening and summary were narrowed to "most" resources while preserving the correct claim that virtual machines, databases, and storage accounts are placed in resource groups.
- The provider example pinned AzureRM to `~> 3.0`, while the current AzureRM provider documentation uses the 4.x line. Updated the example to `~> 4.0`.
- The RBAC section uses the `azuread_group` data source, but the provider configuration only declared `azurerm`. Added the `hashicorp/azuread` provider to make the examples complete.
- The resource group budget example used `2026-01-01T00:00:00Z` as the monthly budget start date. As of the validation date, that is outside the current monthly time-grain period allowed by the provider documentation. Updated the example to start on `2026-06-01T00:00:00Z` and end on `2027-06-01T00:00:00Z`.
- The multi-environment section described the example as module-based, but the code uses direct `for_each` resources. Updated the wording to match the implementation.

## Review Notes
- The AzureRM resource schemas shown for resource groups, management locks, role assignments, policy assignments, and consumption budgets are otherwise consistent with current provider documentation.
- The policy assignment example depends on the built-in policy definition display name being available in the target tenant/cloud. In production code, using a known policy definition ID can be more deterministic.
