# Validation Summary: How to Set Up Azure DevOps Pipeline Decorators to Inject Steps into All

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure DevOps
- Azure Pipelines
- Pipeline decorators
- Azure DevOps extensions
- Visual Studio Marketplace
- TFX CLI
- YAML pipeline syntax
- Azure Pipelines logging commands

## Sources Consulted
- Microsoft Learn: Author a pipeline decorator - https://learn.microsoft.com/en-us/azure/devops/extend/develop/add-pipeline-decorator?view=azure-devops
- Microsoft Learn: Pipeline decorator expression context - https://learn.microsoft.com/en-us/azure/devops/extend/develop/pipeline-decorator-context?view=azure-devops
- Microsoft Learn: Extension manifest reference - https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest?view=azure-devops
- Microsoft Learn: Publish an Azure DevOps Extension From the Command Line - https://learn.microsoft.com/en-us/azure/devops/extend/publish/command-line?view=azure-devops
- Microsoft Learn: Add a Custom Build or Release Task in an Extension - https://learn.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?view=azure-devops
- Microsoft Learn: Azure Pipelines logging commands - https://learn.microsoft.com/en-us/azure/devops/pipelines/scripts/logging-commands?view=azure-devops
- Microsoft Learn: Azure Pipelines expressions - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/expressions?view=azure-devops

## Issues Found
- The manifest example used `ms.azure-pipelines-agent-job` as a decorator target and used `targettaskorder` with `PreJob`. Current Azure DevOps pipeline decorator documentation uses explicit target IDs such as `ms.azure-pipelines-agent-job.pre-job-tasks` and `ms.azure-pipelines-agent-job.post-job-tasks`; there is no documented `targettaskorder` property for this purpose. Updated the manifest and explanation accordingly.
- The manifest example included an empty `targettask` property. Microsoft documents `targettask` only for pre-task and post-task decorator targets, where it should identify a target task GUID. Removed the empty property from the pre-job example.
- The text claimed `ms.azure-pipelines-server-job` and `ms.azure-pipelines.pipeline-decorator` could be used as targets. These are not documented decorator targets. Replaced the claim with documented agent-job targets.
- The pre/post decorator example used the same incorrect target and `targettaskorder` pattern. Updated it to use `ms.azure-pipelines-agent-job.pre-job-tasks` and `ms.azure-pipelines-agent-job.post-job-tasks`.
- The `task.uploadsummary` example emitted the upload logging command before creating the Markdown file. Azure Pipelines processes logging commands from stdout as they are written, so the summary file should exist first. Reordered the script to create the file and then upload it.
- The metadata report example used Bash-style variable assignment under `CmdLine@2`. Changed that example to `PowerShell@2` with `pwsh: true`, `targetType: inline`, and `Write-Host` for the Azure Pipelines logging command.
- The telemetry example used shell command substitution for a timestamp inside a `CmdLine@2` script, which can conflict with Azure Pipelines macro syntax. Replaced it with the built-in `$(Build.BuildId)` variable for a portable telemetry identifier.
- The directory layout showed `icon.png`, but the sample manifest did not reference an icon. Removed it from the required minimal layout to avoid implying it is required for the shown manifest.

## Review Notes
The TFX packaging command and private publish/share flow are consistent with Microsoft documentation. Template expressions and pipeline variables are documented as available in decorator context, although Microsoft examples often use `resources.repositories['self']` for branch checks when the default branch is needed.
