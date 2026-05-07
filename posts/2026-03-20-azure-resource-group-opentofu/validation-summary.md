# Validation Summary: How to Create a Resource Group with OpenTofu on Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Resource Manager
- Azure Resource Groups
- Azure resource locks
- HCL
- AzureRM provider

## Sources Consulted
- OpenTofu `for_each` meta-argument docs: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu input variables docs: https://opentofu.org/docs/language/values/variables/
- OpenTofu output values docs: https://opentofu.org/docs/v1.9/language/values/outputs/
- Azure Resource Manager overview: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/overview
- Azure resource naming rules: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules
- Azure resource locks: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources
- Azure resource group quickstart with Terraform/AzureRM: https://learn.microsoft.com/en-us/azure/developer/terraform/azurerm/create-resource-group
- AzureRM provider docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- AzureRM `azurerm_resource_group` docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group
- AzureRM `azurerm_management_lock` docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/management_lock

## Issues Found
- The introduction stated that every Azure resource belongs to exactly one resource group and implied resource groups are the first step in any Azure deployment. I corrected this to match Azure documentation, which allows some resource types at subscription, management-group, or tenant scope.
- The post did not state that the examples depend on an existing `azurerm` provider configuration. I added a short note so the snippets are technically accurate in context.
- The multiple-resource-group example used `var.common_tags` without declaring it. I added a `common_tags` variable with `map(string)` type and an empty default.
- The conclusion said resource groups are containers for all other Azure resources. I corrected this to most resources deployed at resource-group scope.

## Review Notes
- The naming convention section is technically acceptable as a recommendation, but it is stricter than Azure's actual resource-group naming rules. Azure also allows periods and parentheses, and resource-group names are case-insensitive.
