# Validation Summary: Create Deployment Stacks in Azure Bicep to Manage Resource Lifecycle as a Unit

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Bicep
- Azure deployment stacks
- Azure Resource Manager
- Azure CLI
- Azure App Service
- Azure Storage
- Azure Pipelines

## Sources Consulted
- Microsoft Learn: Create and deploy a deployment stack with Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/quickstart-create-deployment-stacks
- Microsoft Learn: Create and deploy Azure deployment stacks in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deployment-stacks
- Microsoft Learn: az stack group CLI reference - https://learn.microsoft.com/en-us/cli/azure/stack/group
- Microsoft Learn: az stack sub CLI reference - https://learn.microsoft.com/en-us/cli/azure/stack/sub
- Microsoft Learn: az stack mg CLI reference - https://learn.microsoft.com/en-us/cli/azure/stack/mg
- Microsoft Learn: Deploy resources to management group - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-to-management-group
- Microsoft Learn: Microsoft.Storage/storageAccounts Bicep resource reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts
- Microsoft Learn: Microsoft.Web/serverfarms Bicep resource reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/serverfarms
- Microsoft Learn: Microsoft.Web/sites Bicep resource reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/sites
- Microsoft Learn: AzureCLI@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2

## Issues Found
- The management group scope description said deployment stacks can manage subscriptions and their resource groups. Azure Resource Manager management-group deployments can target subscriptions and resource groups within the management group, but subscriptions themselves are not managed as ordinary stack resources. Updated the wording to "can target subscriptions and resource groups within the management group."

## Review Notes
- Azure CLI is not installed in the local environment, so command verification was performed against the official Microsoft Learn CLI reference rather than local `az --help` output.
- The Bicep examples use valid resource types and properties for the cited API versions. Newer API versions are available for some resources, but the versions used in the post are still documented.
