# Validation Summary: How to Create Azure Bicep Shared Variable Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Bicep
- Azure Resource Manager deployments
- Bicep modules
- Bicep user-defined types and imports
- Bicep `loadJsonContent`
- `bicepconfig.json` module aliases and linter rules
- Azure CLI deployment what-if
- Azure resource naming conventions

## Sources Consulted
- Microsoft Learn: Bicep file functions, including `loadJsonContent` - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-functions-files
- Microsoft Learn: User-defined data types in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/user-defined-data-types
- Microsoft Learn: Imports in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-import
- Microsoft Learn: Configure your Bicep environment - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-config
- Microsoft Learn: Add module settings in the Bicep config file - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-config-modules
- Microsoft Learn: Bicep modules and module scope - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/modules
- Microsoft Learn: Deploy Bicep files to subscription scope - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-to-subscription
- Microsoft Learn: Azure resource naming rules and restrictions - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules
- Microsoft Learn: Microsoft.Storage/storageAccounts 2023-01-01 template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-01-01/storageaccounts
- Microsoft Learn: Microsoft.KeyVault/vaults template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.keyvault/vaults
- Microsoft Learn: Azure CLI `az deployment group what-if` - https://learn.microsoft.com/en-us/cli/azure/deployment/group?view=azure-cli-latest#az-deployment-group-what-if

## Issues Found
- The first pattern was titled "User-Defined Types with a Naming Module" even though the section only demonstrates a naming module. Changed the heading to "Naming Module" so it accurately describes the pattern.
- The first `main.bicep` example attempted to create a resource group and a storage account together in a way that mixed deployment scopes. Changed the resource group declaration to an output for deployment scripts and left the storage account as a normal resource-group-scoped resource.
- The complete example defaulted `environment` to `prd`, but the shared JSON config maps full names such as `production` to abbreviations. Changed the default to `production` so `config.naming.environments[environment]` resolves correctly.

## Review Notes
- The examples use older but still valid resource API versions such as `Microsoft.Storage/storageAccounts@2023-01-01` and `Microsoft.KeyVault/vaults@2023-07-01`. Newer API versions are available, but these versions are not deprecated in the referenced template documentation.
- Several generated names are illustrative and may still need organization-specific constraints for global uniqueness and stricter character validation, especially for globally scoped resources such as storage accounts, Key Vaults, App Services, and container registries.
