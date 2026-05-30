# Validation Summary: How to Set Up Continuous Deployment from Azure DevOps to Azure App Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure App Service
- Azure App Service deployment slots
- Azure DevOps Pipelines
- Azure Resource Manager service connections
- Microsoft Entra ID workload identity federation
- .NET 8
- Node.js
- YAML pipeline configuration

## Sources Consulted
- Microsoft Learn: AzureWebApp@1 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-web-app-v1
- Microsoft Learn: AzureAppServiceManage@0 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-app-service-manage-v0
- Microsoft Learn: AzureAppServiceSettings@1 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-app-service-settings-v1
- Microsoft Learn: DotNetCoreCLI@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/dotnet-core-cli-v2
- Microsoft Learn: Build, test, and deploy .NET Core projects: https://learn.microsoft.com/en-us/azure/devops/pipelines/ecosystems/dotnet-core
- Microsoft Learn: Publish and download build artifacts: https://learn.microsoft.com/en-us/azure/devops/pipelines/artifacts/build-artifacts
- Microsoft Learn: NodeTool@0 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/node-tool-v0
- Microsoft Learn: Define approvals and checks: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals
- Microsoft Learn: Azure Pipelines environments: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/environments
- Microsoft Learn: Connect to Azure with an Azure Resource Manager service connection: https://learn.microsoft.com/en-us/azure/devops/pipelines/library/connect-to-azure
- Microsoft Learn: Configure continuous deployment to Azure App Service: https://learn.microsoft.com/en-us/azure/app-service-web/app-service-continuous-deployment
- Microsoft Learn: Set up staging environments in Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots
- Microsoft Learn: Azure Pipelines YAML trigger schema: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/trigger

## Issues Found
- The service connection instructions used the older "Service principal (automatic)" and "Azure AD" wording. Updated the steps to use "App registration (automatic) with workload identity federation" and Microsoft Entra ID, matching current Azure Resource Manager service connection guidance.
- The Deployment Center section said Azure Pipelines generates and commits a YAML file from the App Service portal. Current App Service documentation says choosing Azure Pipelines sends you to Azure DevOps to configure the pipeline, while App Service Build Service configures continuous deployment from the selected branch. Updated that explanation.

## Review Notes
- The YAML snippets use valid Azure Pipelines task names and inputs for the scenarios shown.
- `NodeTool@0` remains supported, but Microsoft documents `UseNode@1` as the newer Node.js installer task.
- The Node.js archive example is generic and may need adjustment for a specific app layout, such as archiving `dist`, `build`, or the app root depending on the framework and App Service startup model.
