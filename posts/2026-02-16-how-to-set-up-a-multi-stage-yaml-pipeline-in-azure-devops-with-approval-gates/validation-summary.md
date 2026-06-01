# Validation Summary: How to Set Up a Multi-Stage YAML Pipeline in Azure DevOps with Approval Gates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure DevOps YAML pipelines
- Azure Pipelines stages, jobs, deployment jobs, environments, approvals, and checks
- Azure Pipelines built-in tasks: DotNetCoreCLI@2, PublishBuildArtifacts@1, AzureWebApp@1, AzureCLI@2
- Azure CLI App Service slot swap commands
- YAML pipeline variables and output variables

## Sources Consulted
- Microsoft Learn: stages.stage YAML schema, https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/stages-stage?view=azure-pipelines
- Microsoft Learn: Deployment jobs YAML schema, https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/jobs-deployment?view=azure-pipelines
- Microsoft Learn: runOnce deployment strategy YAML schema, https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/jobs-deployment-strategy-run-once?view=azure-pipelines
- Microsoft Learn: Pipeline deployment approvals and checks, https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals?view=azure-devops
- Microsoft Learn: Define variables and output variables, https://learn.microsoft.com/en-us/azure/devops/pipelines/process/variables?tabs=yaml%2Cbatch&view=azure-devops
- Microsoft Learn: DotNetCoreCLI@2 task reference, https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/dotnet-core-cli-v2?view=azure-pipelines
- Microsoft Learn: AzureWebApp@1 task reference, https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-web-app-v1?view=azure-pipelines
- Microsoft Learn: AzureCLI@2 task reference, https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2?view=azure-pipelines
- Microsoft Learn: az webapp deployment slot swap, https://learn.microsoft.com/en-us/cli/azure/webapp/deployment/slot?view=azure-cli-latest

## Issues Found
- The main pipeline published `$(Build.ArtifactStagingDirectory)` as an artifact but did not create or copy any deployable package into that directory. Added a `DotNetCoreCLI@2` publish step that outputs zipped web app artifacts to `$(Build.ArtifactStagingDirectory)` before `PublishBuildArtifacts@1`.
- The Azure Web App deployment examples omitted `appType`. The current `AzureWebApp@1` task reference lists `appType` as required, so `appType: 'webApp'` was added to the Windows App Service examples.
- The post said stages would run in parallel without `dependsOn`. Azure DevOps stages run sequentially by default unless dependencies are overridden, so the explanation was corrected.
- The rollback example used a plain script with `az webapp deployment slot swap`, which would not automatically authenticate with the Azure service connection used by `AzureWebApp@1`. Replaced it with an `AzureCLI@2` task using the same service connection.
- The rollback wording implied a guaranteed rollback to the previous version. The example only works that way if the staging slot contains the version to restore, so the prose was narrowed to that deployment pattern.

## Review Notes
- `PublishBuildArtifacts@1` is still valid, but Microsoft recommends pipeline artifacts for better performance in Azure DevOps Services. The post's use of build artifacts remains technically acceptable.
- Approval and check configuration is managed on Azure DevOps resources such as environments, not directly in the YAML file. The post correctly describes this separation.
