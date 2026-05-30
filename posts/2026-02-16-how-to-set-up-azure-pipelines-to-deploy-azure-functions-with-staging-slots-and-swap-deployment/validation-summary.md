# Validation Summary: How to Set Up Azure Pipelines to Deploy Azure Functions with Staging Slots

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Functions
- Azure Functions deployment slots
- Azure Pipelines YAML
- Azure DevOps pipeline tasks
- Azure CLI
- .NET Azure Functions
- Node.js Azure Functions

## Sources Consulted
- Azure Functions deployment slots: https://learn.microsoft.com/en-gb/azure/azure-functions/functions-deployment-slots
- Azure Functions deployment with Azure Pipelines: https://learn.microsoft.com/en-us/azure/azure-functions/functions-how-to-azure-devops
- Azure CLI `az functionapp deployment slot`: https://learn.microsoft.com/en-us/cli/azure/functionapp/deployment/slot
- Azure CLI `az functionapp config appsettings`: https://learn.microsoft.com/en-us/cli/azure/functionapp/config/appsettings
- Azure CLI `az webapp traffic-routing`: https://learn.microsoft.com/en-us/cli/azure/webapp/traffic-routing
- Azure Pipelines `AzureFunctionApp@2` task: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-function-app-v2
- Azure Pipelines `AzureAppServiceManage@0` task: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-app-service-manage-v0
- Azure Pipelines `DotNetCoreCLI@2` task: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/dotnet-core-cli-v2
- Azure Pipelines `DownloadBuildArtifacts@1` task: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/download-build-artifacts-v1
- .NET CLI `dotnet publish`: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-publish
- Azure Functions supported languages and Node.js versions: https://learn.microsoft.com/en-us/azure/azure-functions/supported-languages

## Issues Found
- The post described slot swaps as fully zero-downtime. Microsoft documents seamless traffic redirection for new requests, but currently executing functions can be terminated during a swap. I changed the wording to low-downtime/no dropped new HTTP requests and quick rollback.
- The post implied deployment slots apply to all Azure Functions hosting options. Flex Consumption does not currently support deployment slots, so I added a hosting-option caveat and changed the final recommendation to "supported Function Apps."
- The slot-specific settings example first set `DatabaseConnection` as a regular app setting before setting it as a slot setting. I simplified it to use `--slot-settings` directly.
- The .NET build example used `dotnet build --output` as the deployment package source. I changed it to `dotnet publish`, pointed the pipeline at a specific function project, and disabled the `DotNetCoreCLI@2` default publish zipping/path modification before archiving the publish output.
- The artifact download step referenced `$(Pipeline.Workspace)` but did not set `DownloadBuildArtifacts@1` to download there. I added `buildType`, `downloadType`, and `downloadPath` inputs so the package path matches the deploy task.
- The `AzureAppServiceManage@0` examples used lower-cased input names for swap task inputs. I updated them to the documented input names: `Action`, `WebAppName`, `ResourceGroupName`, and `SourceSlot`.
- The Node.js example used Node.js 18.x, which is no longer a supported Azure Functions Node.js runtime in the current official support table. I updated the example to Node.js 22.x.
- The canary examples used `az functionapp traffic-routing`, which is not an Azure CLI command group. I changed those commands to the documented `az webapp traffic-routing` group and clarified that the routing applies to HTTP traffic.

## Review Notes
- The local environment did not have the Azure CLI installed, so CLI command validation was performed against Microsoft Learn command reference pages rather than local `az --help` output.
- The sample health check endpoint and project path remain placeholders that readers must adapt to their own function app.
