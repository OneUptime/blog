# Validation Summary: How to Use Azure Resource Manager to Export Existing Resources as ARM Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Resource Manager
- ARM templates
- Bicep
- Azure CLI
- Azure PowerShell
- Azure portal template export
- Azure deployment validation and what-if
- Azure Key Vault secret handling

## Sources Consulted
- Microsoft Learn: Use Azure portal to export a template - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/export-template-portal
- Microsoft Learn: Azure CLI `az group export` reference - https://learn.microsoft.com/en-us/cli/azure/group
- Microsoft Learn: Azure CLI `az resource` reference - https://learn.microsoft.com/en-us/cli/azure/resource
- Microsoft Learn: `Export-AzResourceGroup` PowerShell reference - https://learn.microsoft.com/en-us/powershell/module/az.resources/export-azresourcegroup
- Microsoft Learn: Decompile ARM templates to Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/decompile
- Microsoft Learn: Azure CLI `az bicep decompile` reference - https://learn.microsoft.com/en-us/cli/azure/bicep
- Microsoft Learn: ARM template deployment what-if - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-what-if
- Microsoft Learn: Azure Resource Manager deployment modes - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-modes
- Microsoft Learn: Use Azure Key Vault to pass a secret as a parameter during Bicep deployment - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/key-vault-parameter
- Microsoft Learn: `Microsoft.Sql/servers` Bicep resource reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.sql/2024-05-01-preview/servers

## Issues Found
- The Azure CLI example used `az resource export`, which is not listed in the current official `az resource` command reference. Replaced it with the supported `az group export --resource-ids` pattern for exporting specific resources from a resource group.
- The portal export description said Azure generates only a JSON ARM template and implied all properties are included. Current portal documentation supports exporting ARM JSON templates or Bicep files and notes export limitations. Updated the wording to say ARM JSON or Bicep and "exportable properties."
- The Bicep secrets example used `keyVault.getSecret()` directly inside a resource property. Bicep only allows `getSecret()` in a module `params` section for secure parameters, so the example would not compile. Replaced it with a valid `@secure()` parameter pattern that can be populated from Key Vault or pipeline secrets.

## Review Notes
The remaining workflow, validation, decompilation, and export limitation guidance is consistent with Microsoft documentation. Future improvements could mention that Azure PowerShell can export directly as Bicep with `-OutputFormat Bicep`, and that what-if delete results apply when using complete mode; the current examples use the default incremental mode.
