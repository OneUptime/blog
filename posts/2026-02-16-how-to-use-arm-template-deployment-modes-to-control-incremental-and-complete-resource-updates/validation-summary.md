# Validation Summary: How to Use ARM Template Deployment Modes to Control Incremental

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Resource Manager templates
- Bicep
- Azure CLI
- Azure deployment modes
- Azure deployment what-if
- Azure resource locks
- Azure Pipelines

## Sources Consulted
- Azure Resource Manager deployment modes: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-modes
- Deletion of Azure resources for complete mode deployments: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-complete-mode-deletion
- Template deployment what-if: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-what-if
- Azure CLI `az deployment group` reference: https://learn.microsoft.com/en-us/cli/azure/deployment/group
- Azure CLI export template documentation: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/export-template-cli
- Bicep decompile documentation: https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/decompile
- `Microsoft.Storage/storageAccounts` Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts
- `Microsoft.Authorization/locks` Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.authorization/2020-05-01/locks
- Azure resource locks documentation: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources

## Issues Found
- The post described complete mode as a generally appropriate deletion mechanism. Microsoft documentation now says complete mode is not recommended and that deployment stacks should be used for deletion workflows because complete mode will be gradually deprecated. I updated the complete mode guidance and pipeline notes to mention deployment stacks.
- The post stated that complete mode deletes any resource missing from the template. Microsoft documents resource-type-specific deletion behavior for complete mode, so I changed those claims to refer to supported resource types in the deployment target resource group.
- The post incorrectly claimed that tags are merged in incremental mode and replaced in complete mode. Microsoft documents that when redeploying an existing resource in incremental mode, all properties are reapplied and properties are not incrementally added. I updated the properties section and Bicep comments to explain that tags and other properties can be removed or reset when omitted from the redeployed resource definition.

## Review Notes
The Azure CLI commands and flags shown in the post match the current Azure CLI documentation. The Bicep snippets use valid resource types and API versions. The `az group export` and `az bicep decompile` workflow is valid as a starting point, but Microsoft notes exported templates usually require cleanup before production use.
