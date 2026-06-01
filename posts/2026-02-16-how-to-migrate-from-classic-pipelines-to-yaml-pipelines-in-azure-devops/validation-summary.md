# Validation Summary: How to Migrate from Classic Pipelines to YAML Pipelines in Azure DevOps

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure DevOps
- Azure Pipelines
- Classic build pipelines
- Classic release pipelines
- YAML pipelines
- Pipeline stages and deployment jobs
- Azure DevOps environments, approvals, and checks
- Azure Pipeline variable groups
- Azure Pipeline task templates
- Azure Web App deployment task
- .NET CLI pipeline task

## Sources Consulted
- Microsoft Learn: Migrate your Classic pipeline to YAML - https://learn.microsoft.com/en-us/azure/devops/pipelines/release/from-classic-pipelines?view=azure-devops
- Microsoft Learn: Configure schedules to run pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/scheduled-triggers?view=azure-devops
- Microsoft Learn: Define approvals and checks - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals?view=azure-devops
- Microsoft Learn: Create and target Azure DevOps environments for pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/environments?view=azure-devops
- Microsoft Learn: Deployment jobs YAML schema - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/jobs-deployment
- Microsoft Learn: DotNetCoreCLI@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/dotnet-core-cli-v2?view=azure-pipelines
- Microsoft Learn: AzureWebApp@1 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-web-app-v1?view=azure-pipelines
- Microsoft Learn: Publish and download pipeline artifacts - https://learn.microsoft.com/en-us/azure/devops/pipelines/artifacts/pipeline-artifacts?view=azure-devops
- Microsoft Learn: Manage variable groups - https://learn.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups?view=azure-devops
- Microsoft Learn: variables.group YAML schema - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/variables-group?view=azure-pipelines
- Microsoft Learn: Service connections - https://learn.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints?view=azure-devops
- Microsoft Learn: steps.template YAML schema - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/steps-template?view=azure-pipelines

## Issues Found
- The post implied the YAML export option was broadly available for existing classic pipelines. Microsoft documents that only classic build pipelines created with the classic build designer can be exported to YAML, while classic release pipelines do not support YAML export. Updated the export section to make that limitation explicit.
- The `DotNetCoreCLI@2` publish examples specified a `projects` path but did not set `publishWebProjects: false`. In the task reference, `publishWebProjects` defaults to `true` for publish commands, which causes the task to skip the `projects` value. Added `publishWebProjects: false` to both publish examples that target `**/MyApp.csproj`.
- The artifact handling pitfall said YAML deployment jobs use `$(Pipeline.Workspace)` and the download task. Microsoft documents that deployment jobs automatically download artifacts to `$(Pipeline.Workspace)` by default, while regular jobs require an explicit download step or task. Updated the wording accordingly.
- The service connection pitfall said YAML pipelines authenticate differently than classic ones. Microsoft documents the key migration concern as referencing the service connection by name in YAML and authorizing the pipeline to use it. Reworded the statement to avoid implying a different authentication model.
- The scheduled trigger pitfall had the precedence reversed. Microsoft documents that UI-defined scheduled triggers take precedence over YAML scheduled triggers. Corrected the statement.

## Review Notes
The remaining YAML snippets and migration guidance are consistent with the referenced Microsoft documentation. For Azure DevOps Services, Microsoft generally recommends Pipeline Artifacts for performance, but `PublishBuildArtifacts@1` remains documented and valid, especially for compatibility with classic build artifact patterns.
