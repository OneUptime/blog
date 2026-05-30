# Validation Summary: Use Azure Bicep Conditional Deployments to Handle Environment-Specific Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Bicep
- Azure Resource Manager deployments
- Azure Cache for Redis
- Azure Storage
- Azure App Service
- Application Insights
- Azure CDN
- Azure Monitor diagnostic settings
- Azure Pipelines
- Azure CLI

## Sources Consulted
- Microsoft Learn: Conditional deployments in Bicep with the if expression - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/conditional-resource-deployment
- Microsoft Learn: Iterative loops in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/loops
- Microsoft Learn: Bicep null-forgiving operator - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/operator-null-forgiving
- Microsoft Learn: Bicep safe-dereference operator - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/operator-safe-dereference
- Microsoft Learn: Create a parameters file for Bicep deployment - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/parameter-files
- Microsoft Learn: Microsoft.Cache/redis 2023-08-01 - https://learn.microsoft.com/en-us/azure/templates/microsoft.cache/2023-08-01/redis
- Microsoft Learn: Microsoft.Storage/storageAccounts 2023-01-01 - https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-01-01/storageaccounts
- Microsoft Learn: Microsoft.Storage/storageAccounts/blobServices 2023-01-01 - https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-01-01/storageaccounts/blobservices
- Microsoft Learn: Microsoft.Insights/components 2020-02-02 - https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/2020-02-02/components
- Microsoft Learn: Microsoft.Web/sites 2023-01-01 - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2023-01-01/sites
- Microsoft Learn: Microsoft.Cdn/profiles 2023-05-01 - https://learn.microsoft.com/en-us/azure/templates/microsoft.cdn/2023-05-01/profiles
- Microsoft Learn: Microsoft.Insights/diagnosticSettings 2021-05-01-preview - https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/2021-05-01-preview/diagnosticsettings
- Microsoft Learn: AzureCLI@2 task - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2
- Microsoft Learn: az deployment group create - https://learn.microsoft.com/en-us/cli/azure/deployment/group
- Microsoft Learn: Application Insights connection strings - https://learn.microsoft.com/en-us/azure/azure-monitor/app/connection-strings

## Issues Found
- The post said Bicep does not generate any ARM template resources when a condition is false. I changed this to explain that the compiled ARM template includes the condition and Azure Resource Manager skips the resource at deployment time when the condition evaluates to false.
- A storage account comment incorrectly described `allowBlobPublicAccess: false` as enabling soft delete only in production. I changed the comment to say it blocks anonymous blob public access.
- Conditional references to `appInsights`, `redisCache`, and `cdnProfile` could trigger BCP318 nullable-resource diagnostics. I added the Bicep null-forgiving operator in guarded expressions.
- The Application Insights output used `InstrumentationKey`, which is outdated for new guidance after instrumentation key ingestion support ended on March 31, 2025. I changed the output to return the Application Insights connection string.
- The diagnostic settings example used `Microsoft.Insights/diagnosticSettings@2021-05-01`, but the documented API version is `2021-05-01-preview`. I corrected the API version and added `workspaceId` so the diagnostic setting has a Log Analytics destination.
- The pitfall about `existing` resources claimed that existing references cannot be conditional. Microsoft Learn shows conditional `existing` resources are supported, so I rewrote the warning to say the existing resource must exist when the condition is true and references should be guarded.

## Review Notes
The Bicep and Azure CLI examples were checked against official Microsoft documentation. The local environment does not have Azure CLI or the Bicep CLI installed, so validation was documentation-based rather than compiler-based.
