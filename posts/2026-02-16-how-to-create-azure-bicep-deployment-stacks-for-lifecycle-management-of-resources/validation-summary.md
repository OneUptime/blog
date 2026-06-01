# Validation Summary: How to Create Azure Bicep Deployment Stacks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Resource Manager
- Azure Bicep
- Azure deployment stacks
- Azure CLI
- GitHub Actions

## Sources Consulted
- Microsoft Learn: Create and deploy Azure deployment stacks in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deployment-stacks
- Microsoft Learn: Quickstart: Create and deploy a deployment stack with Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/quickstart-create-deployment-stacks
- Microsoft Learn: Azure CLI `az stack group` reference - https://learn.microsoft.com/en-us/cli/azure/stack/group
- Microsoft Learn: Azure CLI `az stack sub` reference - https://learn.microsoft.com/en-us/cli/azure/stack/sub
- Microsoft Learn: Azure Resource Manager deployment modes - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-modes
- Microsoft Learn: Azure template reference for `Microsoft.Storage/storageAccounts` - https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-01-01/storageaccounts
- Microsoft Learn: Azure template reference for `Microsoft.Network/virtualNetworks` - https://learn.microsoft.com/en-us/azure/templates/microsoft.network/2023-09-01/virtualnetworks
- Microsoft Learn: Azure template reference for `Microsoft.OperationalInsights/workspaces` - https://learn.microsoft.com/en-us/azure/templates/microsoft.operationalinsights/workspaces
- Microsoft Learn: Azure template reference for `Microsoft.Resources/resourceGroups` - https://learn.microsoft.com/en-us/azure/templates/microsoft.resources/resourcegroups

## Issues Found
- The post said a removed resource could be detached, deleted, or blocked based on deployment stack configuration. `action-on-unmanage` supports delete or detach behavior; blocking unwanted manual changes is handled separately by deny settings. Changed the wording to say removed resources can be detached or deleted.
- The post implied any deployment stack scope can manage resources across multiple resource groups. Resource group-scoped stacks deploy to the same resource group; subscription and management group scopes are the relevant scopes for managing across resource groups. Updated the sentence to make that scope distinction explicit.
- The first Azure CLI example passed `--deny-settings-excluded-principals ""`. That option expects Microsoft Entra principal IDs and should be omitted when no exclusions are needed. Removed the empty argument from the command.
- The post used `detachResources` as an `--action-on-unmanage` value. Azure CLI accepts `deleteAll`, `deleteResources`, and `detachAll`. Replaced `detachResources` with `detachAll` and adjusted the explanation.

## Review Notes
The Bicep resource declarations use valid resource types and properties. Azure CLI was not installed in the local environment, so CLI syntax was verified against Microsoft Learn command reference instead of local `az --help` output.
