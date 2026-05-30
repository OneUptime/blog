# Validation Summary: How to Use Azure Developer CLI to Scaffold

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Developer CLI (`azd`)
- Azure project templates
- Azure Bicep
- `azure.yaml`
- Azure App Service
- Azure Container Apps
- Azure Functions
- Azure Static Web Apps
- Azure Kubernetes Service
- GitHub Actions
- Azure Pipelines
- Azure Storage

## Sources Consulted
- Azure Developer CLI reference: https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/reference
- Install or update the Azure Developer CLI: https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/install-azd
- Azure Developer CLI templates overview: https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/azd-templates
- Azure Developer CLI `azure.yaml` schema: https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/azd-schema
- Work with Azure Developer CLI environments: https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/work-with-environments
- Explore Azure Developer CLI support for CI/CD pipelines: https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/configure-devops-pipeline
- Azure Developer CLI template gallery: https://azure.github.io/awesome-azd/
- Microsoft.Storage/storageAccounts Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-05-01/storageaccounts
- Azure Cache for Redis retirement notice: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-whats-new

## Issues Found
- The macOS Homebrew install command used the older tap-and-install form. Updated it to the current Microsoft-documented `brew install azure/azd/azd` command.
- The authentication verification command used `azd auth show`, which is not in the current `azd` command reference. Updated it to `azd auth status`.
- The post said `azd init --template` prompts for environment name, subscription, and location. Current documentation says `azd init` creates the first environment when needed, while subscription and location prompts occur during commands such as `azd up`, `azd provision`, or `azd deploy`. Reworded this explanation.
- The infrastructure customization example used Azure Cache for Redis Basic and output an incomplete Redis connection string. Azure Cache for Redis SKUs are now in retirement, and the example omitted the access key required by typical Redis connection strings. Replaced the example with a current Azure Storage Account Bicep snippet and blob endpoint output.

## Review Notes
- The remaining `azd` workflow commands, template gallery link, `azure.yaml` example fields, `azd provision --preview`, `azd deploy`, `azd up`, environment commands, pipeline setup command, monitoring commands, and cleanup commands matched current official documentation.
- `azd pipeline config` is documented as beta, but the command and described behavior are still current.
