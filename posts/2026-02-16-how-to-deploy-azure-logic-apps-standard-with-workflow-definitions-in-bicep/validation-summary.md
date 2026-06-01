# Validation Summary: How to Deploy Azure Logic Apps Standard with Workflow Definitions in Bicep

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Logic Apps Standard
- Azure Bicep
- Azure App Service and Workflow Standard hosting plans
- Azure CLI
- Azure Resource Manager deployment scripts
- Azure Monitor diagnostic settings
- Log Analytics

## Sources Consulted
- Microsoft Learn: Edit app and host settings for Standard logic apps in single-tenant Azure Logic Apps: https://learn.microsoft.com/en-us/azure/logic-apps/edit-app-settings-host-settings
- Microsoft Learn: DevOps deployment for Standard workflows in single-tenant Azure Logic Apps: https://learn.microsoft.com/en-us/azure/logic-apps/devops-deployment-single-tenant-azure-logic-apps
- Microsoft Learn: Azure CLI `az logicapp deployment source config-zip`: https://learn.microsoft.com/en-us/cli/azure/logicapp/deployment/source
- Microsoft Learn: `Microsoft.Web/sites/config` Bicep resource reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.web/sites/config
- Microsoft Learn: Use deployment scripts in Bicep: https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deployment-script-bicep
- Microsoft Learn: Supported logs for `Microsoft.Web/sites`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-web-sites-logs
- Microsoft Learn: `Microsoft.Insights/diagnosticSettings` Bicep resource reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/diagnosticsettings

## Issues Found
- The post claimed the workflow definitions could be embedded entirely in Bicep. Microsoft documents Standard Logic Apps as a project/file deployment model where infrastructure can be provisioned separately and workflow artifacts are packaged and deployed. Updated the description and surrounding explanation to describe Bicep-managed infrastructure plus source-controlled workflow artifacts.
- The Logic App app settings used `FUNCTIONS_WORKER_RUNTIME: node`, which Microsoft now documents as `dotnet` for new and existing Standard Logic Apps. Updated both Bicep snippets to use `dotnet`.
- The Logic App app settings omitted `WEBSITE_NODE_DEFAULT_VERSION`, which Microsoft lists for Standard Logic Apps running on Windows. Added `WEBSITE_NODE_DEFAULT_VERSION: ~20`.
- The deployment script snippet referenced `workflow.json` without creating it and used an incomplete user-assigned managed identity block. Reworked the snippet so it writes the Bicep workflow variable into the expected workflow folder, creates minimal `host.json` and `connections.json` files, zips the project, and deploys with the documented `az logicapp deployment source config-zip` command.
- The file-based deployment example zipped only a `workflows` folder. Standard Logic Apps projects include root-level project files such as `host.json` and `connections.json`, so the example now zips a `logicapp` project folder containing those files and workflow directories.

## Review Notes
The post is technically valid after edits. For production use, teams should prefer full file-based Standard Logic Apps project deployment over generating workflow files inside Bicep deployment scripts, especially when workflows use managed connections or shared artifacts.
