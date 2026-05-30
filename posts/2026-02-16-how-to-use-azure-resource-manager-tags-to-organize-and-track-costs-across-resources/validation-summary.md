# Validation Summary: How to Use Azure Resource Manager Tags to Organize

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Resource Manager tags
- Azure CLI
- Azure PowerShell
- Bicep
- Azure Policy
- Azure Cost Management
- Azure RBAC and Azure ABAC

## Sources Consulted
- Azure Resource Manager tags documentation: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-resources
- Azure tag policy definitions: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-policies
- Azure CLI `az resource` reference: https://learn.microsoft.com/en-us/cli/azure/resource?view=azure-cli-latest
- Azure CLI `az costmanagement` reference: https://learn.microsoft.com/en-us/cli/azure/costmanagement?view=azure-cli-latest
- Azure Cost Management Query REST API: https://learn.microsoft.com/en-us/rest/api/cost-management/query/usage?view=rest-cost-management-2025-03-01
- Azure ABAC overview: https://learn.microsoft.com/en-us/azure/role-based-access-control/conditions-overview
- Azure role assignment condition syntax: https://learn.microsoft.com/en-us/azure/role-based-access-control/conditions-format

## Issues Found
- The tag-limit description implied every resource supports 50 tags with the same key length. Updated it to include documented exceptions, including the 128-character tag-name limit for storage accounts and resource-type exceptions.
- The PowerShell merge example would fail when `$resource.Tags` is null. Initialized an empty hashtable and copied existing tags only when present.
- The Azure Policy section said the deny policy applies to all resources. Clarified that `Indexed` tag policies apply to taggable resources.
- The Cost Management CLI example used `az costmanagement query`, which is not present in the current official Azure CLI costmanagement reference. Replaced it with an `az rest` call against the official Cost Management Query REST API using `PreTaxCost`, `Sum`, `None` granularity, and `TagKey` grouping.
- The cost-analysis wording implied all tags are available for cost grouping. Clarified that this depends on services emitting tags in cost data.
- The ABAC section overstated generic resource-tag-based RBAC support. Revised it to state that Azure ABAC role assignment conditions currently apply to supported blob storage and queue storage data actions, and that general ARM resource access should use normal RBAC scopes and Azure Policy.

## Review Notes
The remaining Azure CLI tag commands, Azure Policy modify example, and Bicep tag syntax align with current official guidance. The Bicep virtual machine block remains illustrative because the VM `properties` content is intentionally omitted.
