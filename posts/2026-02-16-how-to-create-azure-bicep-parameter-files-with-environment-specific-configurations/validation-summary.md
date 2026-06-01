# Validation Summary: Create Azure Bicep Parameter Files with Environment-Specific Configurations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Resource Manager
- Azure Bicep
- Bicep parameter files (`.bicepparam`)
- ARM JSON parameter files
- Azure CLI deployments
- Azure Key Vault secret references

## Sources Consulted
- Microsoft Learn: Create a parameters file for Bicep deployment - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/parameter-files
- Microsoft Learn: Parameters in Bicep files - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/parameters
- Microsoft Learn: Deploy Bicep files with the Azure CLI - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-cli
- Microsoft Learn: Bicep functions for Bicep parameters files - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-functions-parameters-file
- Microsoft Learn: Use Azure Key Vault to pass a secret as a parameter during Bicep deployment - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/key-vault-parameter
- Microsoft Learn: az deployment group - https://learn.microsoft.com/en-us/cli/azure/deployment/group

## Issues Found
- The JSON parameter examples included `//` filename comments inside `json` code blocks. JSON parameter files do not support comments, so I moved the filenames outside the code blocks.
- The variable-based `.bicepparam` example assigned `param resourcePrefix = prefix`, but the earlier linked `main.bicep` template did not declare a `resourcePrefix` parameter. Because `.bicepparam` files linked with `using './main.bicep'` validate parameter names, that example would fail. I removed the undeclared parameter assignment.
- The secrets best-practice note only mentioned Key Vault references for JSON files and pipeline variables. Current Bicep parameter files also support retrieving Key Vault secrets with `getSecret`, so I added that option.

## Review Notes
Azure CLI and Bicep CLI are not installed in this local environment, so commands were verified against official Microsoft documentation rather than executed locally.
