# Validation Summary: How to Import Azure Resource Groups into OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Resource Manager (ARM)
- Azure CLI
- Azure Resource Groups
- Azure management locks
- HCL

## Sources Consulted
- OpenTofu import blocks: https://opentofu.org/docs/language/import/
- OpenTofu CLI import command: https://opentofu.org/docs/cli/import/
- OpenTofu source docs for import blocks: https://raw.githubusercontent.com/opentofu/opentofu/v1.11/website/docs/language/import/index.mdx
- Azure CLI `az group` reference: https://learn.microsoft.com/en-us/cli/azure/group?view=azure-cli-latest
- Azure CLI `az resource` reference: https://learn.microsoft.com/en-us/cli/azure/resource?view=azure-cli-latest
- Azure Resource Manager resource ID formats: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/template-functions-resource
- Azure management locks: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources
- AzureRM `azurerm_resource_group` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/resource_group.html.markdown
- AzureRM `azurerm_management_lock` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/management_lock.html.markdown

## Issues Found
- The introduction said resource groups are the container for all Azure resources. I corrected this to say they are logical containers for related Azure resources, because Azure also has subscription-, management-group-, and tenant-scoped resources.
- The "Write Matching HCL" example added a new `ManagedBy` tag, which would cause a post-import drift/update instead of matching the existing resource group. I removed that tag and clarified that matching existing tags is how to get a no-op plan after import.
- The declarative import example showed only the `import` block. I added `tofu plan` and `tofu apply` because OpenTofu performs configuration-driven imports during the normal plan/apply workflow.
- The multiple-resource-group example used separate import blocks with `var.subscription_id` interpolation and no corresponding variable declaration. I replaced it with a `for_each` import example that matches current OpenTofu documentation for multi-resource imports and uses per-resource IDs from the input map.
- The ARM ID explanation implied one universal resource ID shape. I narrowed it to resource-group-scoped resources because Azure documents that resource ID formats vary by scope, and I updated the conclusion so it points readers to the documented import ID format for each resource type.
- The management-lock import block built the import ID from a resource reference. I changed it to the full literal resource ID to align with OpenTofu's documented import-block requirements and the AzureRM provider's documented lock import format.

## Review Notes
- OpenTofu's current documentation still labels configuration-driven `import` blocks as experimental.
- The workspace did not have the `tofu` binary installed, so command and configuration validation was done against official documentation rather than local execution.
