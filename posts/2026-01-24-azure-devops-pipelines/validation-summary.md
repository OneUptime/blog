# Validation Summary: How to Handle Azure DevOps Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure DevOps Pipelines
- Azure Pipelines YAML
- Microsoft-hosted and self-hosted agents
- .NET SDK and DotNetCoreCLI pipeline tasks
- Node.js pipeline setup
- Azure App Service deployment with AzureWebApp@1
- Azure Pipeline deployment jobs and environments
- Azure Key Vault and variable groups
- Pipeline caching, artifacts, triggers, schedules, and matrix builds

## Sources Consulted
- Azure Pipelines YAML schema reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/?view=azure-pipelines
- Azure Pipelines trigger schema: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/trigger?view=azure-pipelines
- Azure Pipelines PR trigger schema: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/pr?view=azure-pipelines
- Azure Pipelines scheduled trigger schema: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/schedules-cron?view=azure-pipelines
- Azure Pipelines deployment jobs: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/deployment-jobs?view=azure-devops
- AzureWebApp@1 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-web-app-v1?view=azure-pipelines
- DotNetCoreCLI@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/dotnet-core-cli-v2?view=azure-pipelines
- UseDotNet@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/use-dotnet-v2?view=azure-pipelines
- PublishCodeCoverageResults@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/publish-code-coverage-results-v2?view=azure-pipelines
- NodeTool@0 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/node-tool-v0?view=azure-pipelines
- UseNode@1 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/use-node-v1?view=azure-pipelines
- Azure Pipelines variable groups: https://learn.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups?view=azure-devops
- Azure Pipelines secrets guidance: https://learn.microsoft.com/en-us/azure/devops/pipelines/security/secrets?view=azure-devops
- Azure Pipelines caching: https://learn.microsoft.com/en-us/azure/devops/pipelines/release/caching?view=azure-devops

## Issues Found
- The first pipeline example used `PublishCodeCoverageResults@1`. Microsoft documentation says `PublishCodeCoverageResults@2` is the newest version and v1 will be deprecated, so the example was updated to `PublishCodeCoverageResults@2` and the removed v1-only `codeCoverageTool` input was deleted.
- The multi-stage pipeline example used `NodeTool@0`, which Microsoft documents as deprecated in favor of `UseNode@1`. The example was updated to `UseNode@1` and the input was changed from `versionSpec` to `version`.
- The variable group example echoed `$(mySecret)` directly in script output. Microsoft guidance says secrets should not be echoed and should be mapped into environment variables instead. The example now confirms the mapping without printing the secret.

## Review Notes
- YAML PR triggers are supported for GitHub and Bitbucket Cloud repositories; Azure Repos Git uses branch policies for PR build validation. The post's generic `pr:` examples are syntactically valid, but readers using Azure Repos should be aware of that repository-specific behavior.
- Scheduled trigger cron expressions are evaluated in UTC.
- Environment approval gates are configured on Azure DevOps environments, not directly in the YAML snippets shown.
