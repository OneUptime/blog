# Validation Summary: How to Handle Azure Resource Naming Conventions in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Azure (azurerm provider)
- Microsoft Cloud Adoption Framework (CAF) naming conventions
- `aztfmod/azurecaf` Terraform provider
- Azure resource types: Resource Group, Storage Account, Virtual Machine, Key Vault, SQL Server, Virtual Network, AKS, Container Registry, Log Analytics, Application Insights

## Sources Consulted
- Microsoft Cloud Adoption Framework — Recommended abbreviations for Azure resource types: https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations
- Microsoft Cloud Adoption Framework — Define your naming convention: https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming
- Azure resource naming rules and restrictions: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules
- Terraform `azurerm` provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- `aztfmod/azurecaf` provider documentation: https://registry.terraform.io/providers/aztfmod/azurecaf/latest/docs
- Terraform language built-in functions (`lookup`, `substr`, `replace`, `regex`, `can`, `contains`): https://developer.hashicorp.com/terraform/language/functions

## Issues Found
No technical issues found.

The Azure naming constraints table is accurate (Resource Group ≤ 90, Storage Account ≤ 24 lowercase alphanumeric, VM Linux ≤ 64 / Windows ≤ 15, Key Vault ≤ 24, SQL Server ≤ 63, Virtual Network ≤ 64). The HCL syntax in all examples is valid, and the use of `locals`, `lookup`, `substr`, `replace`, variable `validation` blocks, and module inputs/outputs is correct. The `aztfmod/azurecaf` provider source path and `~> 1.2` version constraint are accurate, and the `azurecaf_name` resource arguments (`name`, `resource_type`, `suffixes`, `clean_input`) are valid per the provider docs.

## Review Notes
- The locals example uses `law-` for Log Analytics workspaces and `ai-` for Application Insights. Microsoft's official CAF abbreviations are `log-` and `appi-` respectively. Both `law-`/`ai-` are widely used community variants, and since the locals section presents an example custom convention (not a strict CAF implementation), this is acceptable. Readers who want strict CAF compliance should rely on the `azurecaf` provider section, which generates official CAF-compliant names automatically.
- The Resource Group "Allowed Characters" entry omits parentheses, which Azure also permits, but the listed characters are all valid and the omission is not misleading.
- The storage account `substr(..., 0, 20)` leaves 4 characters for suffix while the `instance` default is only `"01"` (2 chars). This is a deliberately conservative reservation and not a defect.
- The post's recommendation to enforce naming via Azure Policy is sound general guidance.
