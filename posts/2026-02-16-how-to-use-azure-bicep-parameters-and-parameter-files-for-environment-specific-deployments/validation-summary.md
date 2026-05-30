# Validation Summary: How to Use Azure Bicep Parameters and Parameter Files for Env-Specific

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Bicep
- Bicep parameter files (`.bicepparam`)
- ARM JSON parameter files
- Azure CLI deployments
- Azure Key Vault secret references
- Azure App Service
- Azure SQL Database
- Azure Monitor diagnostic settings
- Azure Pipelines `AzureCLI@2`

## Sources Consulted
- Microsoft Learn: Parameters in Bicep files - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/parameters
- Microsoft Learn: Create a parameters file for Bicep deployment - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/parameter-files
- Microsoft Learn: Deploy Bicep/ARM templates with Azure CLI - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-cli
- Microsoft Learn: Bicep functions for Bicep parameters files - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-functions-parameters-file
- Microsoft Learn: Use Azure Key Vault to pass a secret as a parameter during Bicep deployment - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/key-vault-parameter
- Microsoft Learn: Diagnostic settings in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/diagnostic-settings
- Microsoft Learn: Migrate from diagnostic settings storage retention to Azure Storage lifecycle management - https://learn.microsoft.com/en-au/azure/azure-monitor/essentials/migrate-to-azure-storage-lifecycle-policy
- Microsoft Learn: Configure an App Service app - https://learn.microsoft.com/en-us/azure/app-service/configure-common
- Microsoft Learn: Configure ASP.NET Core apps in Azure App Service - https://learn.microsoft.com/en-gb/azure/app-service/configure-language-dotnetcore
- Microsoft Learn: Azure CLI v2 task (`AzureCLI@2`) - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2

## Issues Found
- The `.bicepparam` deployment commands incorrectly combined `--template-file` with a Bicep parameter file. Current Azure CLI documentation says a `.bicepparam` file with a `using` statement is passed through `--parameters` without `--template-file`; including both causes an error. Removed `--template-file` from the `.bicepparam` Azure CLI examples and the Azure Pipelines example.
- The post described parameter files as JSON files even though it immediately covers `.bicepparam` files. Updated the wording to say parameter files can be `.bicepparam` or JSON.
- The complete Bicep example required `sqlAdminPassword`, but the `.bicepparam` examples did not provide it. Added Key Vault-backed `getSecret()` examples for the secure parameter.
- The production JSON parameter file omitted the required secure SQL password and the diagnostic settings destination. Added a Key Vault `reference` for `sqlAdminPassword` and a `logAnalyticsWorkspaceId` value.
- The App Service example said Always On is not supported on the Basic tier. Microsoft documentation describes Free and Shared as the shared base tiers, while Basic and higher run on dedicated compute. Updated the condition and comment to exclude Free (`F1`) and Shared (`D1`) instead.
- The diagnostic settings example enabled logs without specifying any destination. Azure Monitor diagnostic settings require a destination such as a Log Analytics workspace, storage account, event hub, or partner solution. Added `logAnalyticsWorkspaceId` and wired it to `workspaceId`.
- The diagnostic settings example used `retentionPolicy`; Azure Monitor diagnostic settings storage retention has been deprecated and disabled. Removed the diagnostic-setting retention policy from the example.

## Review Notes
The examples are technically aligned with current Microsoft documentation. I could not run `az` or `bicep` locally because neither CLI is installed in this workspace, so validation was based on official Microsoft documentation and schema references rather than local compilation.
