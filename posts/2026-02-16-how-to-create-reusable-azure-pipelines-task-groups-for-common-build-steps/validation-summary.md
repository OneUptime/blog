# Validation Summary: How to Create Reusable Azure Pipelines Task Groups for Common Build Steps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Pipelines
- Azure DevOps task groups
- Azure Pipelines YAML templates
- DotNetCoreCLI@2
- Docker@2
- PublishBuildArtifacts@1
- SonarQube Azure DevOps tasks

## Sources Consulted
- Microsoft Learn: Task groups in Classic pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/release/task-groups?view=azure-devops
- Microsoft Learn: Manage security in Azure Pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/policies/permissions?view=azure-devops
- Microsoft Learn: YAML templates for reusable pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/templates?view=azure-devops
- Microsoft Learn: DotNetCoreCLI@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/dotnet-core-cli-v2?view=azure-pipelines
- Microsoft Learn: Docker@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2?view=azure-pipelines
- Microsoft Learn: PublishBuildArtifacts@1 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/publish-build-artifacts-v1?view=azure-pipelines
- Microsoft Learn: SonarQubePrepare@8 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/sonar-qube-prepare-v8?view=azure-pipelines
- Microsoft Learn: SonarQubeAnalyze@8 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/sonar-qube-analyze-v8?view=azure-pipelines
- Microsoft Learn: SonarQubePublish@8 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/sonar-qube-publish-v8?view=azure-pipelines

## Issues Found
- The post incorrectly stated that task groups work in YAML pipelines and showed YAML examples referencing a task group as `DotNetBuildAndPublish@1`. Microsoft documentation states task groups are not supported in YAML pipelines. I replaced the invalid YAML task-group section with YAML template examples.
- The introduction overstated that any pipeline can reference a task group and that all updates automatically apply. I narrowed this to classic pipelines in the same project and clarified that automatic pickup applies to minor updates within the current major version.
- The .NET publish task group example used `projects` with `DotNetCoreCLI@2` publish without disabling `publishWebProjects`. Since `publishWebProjects` defaults to true and skips the `projects` input, I added `Publish web projects: false`.
- The code quality example used deprecated SonarQube v5 tasks. I updated the example to SonarQubePrepare@8, SonarQubeAnalyze@8, and SonarQubePublish@8, and added the required SonarQube service connection parameter.
- The versioning workflow skipped the documented preview step for new major versions. I updated the workflow to publish the draft as a preview, validate it, and then publish the preview.
- The task group permissions section used role names that do not match Microsoft documentation. I replaced them with the documented task group permissions: Edit task group, Delete task group, and Administer task group permissions.
- The troubleshooting section said task groups are project-scoped unless explicitly shared. Microsoft documentation describes task groups as project-scoped and supports export/import for moving copies, so I corrected that note.

## Review Notes
The Docker@2 and DotNetCoreCLI@2 task names and core inputs were otherwise consistent with current Microsoft task references. PublishBuildArtifacts@1 remains valid, though Microsoft recommends Publish Pipeline Artifacts for better performance in Azure DevOps Services.
