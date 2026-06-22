# Validation Summary: How to Fix 'Deployment Failed' ARM Template Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Resource Manager (ARM) templates
- Azure CLI deployment commands
- Azure deployment operations and deployment history
- ARM template functions (`resourceId`, `listKeys`)
- ARM resource dependencies (`dependsOn`) and conditions
- Azure deployment modes and deployment stacks
- Azure VM quota and support tickets
- Azure RBAC role assignments and custom roles

## Sources Consulted
- Azure Resource Manager deployment history: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-history
- Azure Resource Manager common deployment errors: https://learn.microsoft.com/en-us/azure/azure-resource-manager/troubleshooting/common-deployment-errors
- Azure Resource Manager deployment modes: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-modes
- ARM template resource functions: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/template-functions-resource
- ARM template resource dependencies: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/resource-dependency
- Azure CLI `az deployment group`: https://learn.microsoft.com/en-us/cli/azure/deployment/group
- Azure CLI `az support in-subscription tickets`: https://learn.microsoft.com/en-us/cli/azure/support/in-subscription/tickets
- ARM template reference for `Microsoft.Storage/storageAccounts`: https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts
- ARM template reference for `Microsoft.Storage/storageAccounts/blobServices/containers`: https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-01-01/storageaccounts/blobservices/containers
- ARM template reference for `Microsoft.Web/sites`: https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2022-09-01/sites
- Azure custom roles: https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles

## Issues Found
- Several ARM JSON snippets used JavaScript-style comments inside `json` code fences. ARM templates and deployment parameter files are JSON, not JSONC, so I removed those comments and split the template/parameters example into separate valid JSON blocks.
- The first template parameter example omitted the required ARM template `contentVersion` field. I added it.
- The quota support-ticket command used the outdated/incorrect command group `az support tickets create` and omitted required arguments. I changed it to the documented `az support in-subscription tickets create` form and added the required contact, title, diagnostic consent, and support-ticket fields.
- The complete-mode note described the behavior correctly but did not reflect current Microsoft guidance that complete mode is not recommended and deployment stacks should be used for deletions. I updated the command comment without changing the surrounding section.
- The Azure CLI custom-role example omitted the optional empty `NotActions`, `DataActions`, and `NotDataActions` arrays shown in Microsoft’s documented custom-role input format. I added them for clarity and compatibility.

## Review Notes
- Azure CLI is not installed in the local workspace, so CLI verification was performed against the current Microsoft Learn command references rather than local `az --help`.
- The ARM resource API versions used in the examples are documented and remain valid for the resource types shown.
- The App Service snippets are illustrative and omit supporting resources such as an App Service plan; that is acceptable for a troubleshooting-focused post but could be expanded in a future full deployment example.
