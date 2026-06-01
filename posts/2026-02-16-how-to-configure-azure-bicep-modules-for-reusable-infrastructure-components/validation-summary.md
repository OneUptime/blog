# Validation Summary: How to Configure Azure Bicep Modules for Reusable Infrastructure Components

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Bicep
- Azure Resource Manager templates
- Azure Storage accounts and blob containers
- Azure App Service
- Azure Container Registry-backed Bicep module registry
- Azure CLI

## Sources Consulted
- Microsoft Learn: Bicep modules - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/modules
- Microsoft Learn: Module setting for Bicep config - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-config-modules
- Microsoft Learn: Azure CLI `az bicep publish` reference - https://learn.microsoft.com/en-us/cli/azure/bicep?view=azure-cli-latest#az-bicep-publish
- Microsoft Learn: Create a private container registry for Bicep modules - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/private-module-registry
- Microsoft Learn: Azure Storage account overview - https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview
- Microsoft Learn: Azure resource naming rules - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules
- Microsoft Learn: Microsoft.Web/sites ARM/Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/sites
- Microsoft Learn: Managed identities for Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity

## Issues Found
- The storage account examples generated names from `baseName`, which includes hyphens, and one example could exceed the 24-character limit for the `staging` environment. Azure Storage account names must be 3-24 characters and contain only lowercase letters and numbers. I changed the examples to use a shorter alphanumeric `storageBaseName` before appending `uniqueSuffix`.
- The App Service module output `appService.identity.principalId` but did not enable a managed identity on the `Microsoft.Web/sites` resource. I added a system-assigned identity so the principal ID output corresponds to a real App Service managed identity.

## Review Notes
- The Bicep module syntax, module output dependency behavior, private registry references, alias format, and `az bicep publish` command shape match current Microsoft documentation.
- The local environment does not have `az` or `bicep` installed, so validation was performed against official documentation rather than by compiling the snippets locally.
