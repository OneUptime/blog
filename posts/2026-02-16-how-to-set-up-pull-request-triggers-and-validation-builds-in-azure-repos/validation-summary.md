# Validation Summary: How to Set Up Pull Request Triggers and Validation Builds in Azure Repos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Repos
- Azure Pipelines YAML
- Azure DevOps branch policies
- Build validation policies
- .NET CLI and DotNetCoreCLI@2
- Azure Pipelines Cache@2 and PublishBuildArtifacts@1 tasks

## Sources Consulted
- Microsoft Learn: Build Azure Repos Git repositories - Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/azure-repos-git?view=azure-devops
- Microsoft Learn: PR trigger YAML schema: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/pr?view=azure-pipelines
- Microsoft Learn: Branch policies and settings - Azure Repos: https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops
- Microsoft Learn: az repos policy build: https://learn.microsoft.com/en-us/cli/azure/repos/policy/build?view=azure-cli-latest
- Microsoft Learn: DotNetCoreCLI@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/dotnet-core-cli-v2?view=azure-pipelines
- Microsoft Learn: dotnet test command with VSTest: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-vstest
- Microsoft Learn: Pipeline caching in Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/release/caching?view=azure-devops
- Microsoft Learn: Cache@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/cache-v2?view=azure-pipelines

## Issues Found
- The post incorrectly described YAML `pr:` triggers as the mechanism for Azure Repos PR validation. Microsoft documentation states that YAML PR triggers are supported only for GitHub and Bitbucket Cloud, and Azure Repos Git uses branch policies for PR validation. I rewrote the trigger sections and removed `pr:` blocks from Azure Repos YAML examples.
- The post placed branch and path filtering in YAML PR triggers. For Azure Repos, those filters belong on the build validation policy. I moved the guidance to branch policy path filters and updated the multiple-pipeline examples accordingly.
- The build expiration bullet said "source branch" updates expire stale builds. Azure Repos build expiration settings are about updates to the protected target branch. I corrected this to "target branch."
- The first paragraph implied any build failure always blocks merge. I clarified that required build validation policies block completion unless a user has bypass permissions.
- The NuGet cache snippet used `$(NUGET_PACKAGES)` without defining it. I added a pipeline variable and made the snippet syntactically complete with `steps:`.
- The .NET test parallelization snippet used `dotnet test --parallel`, which is not a documented VSTest `dotnet test` option. I changed it to use the documented `TestTfmsInParallel` MSBuild property for multi-targeted .NET test projects.
- The optional-policy section described specific warning/blocker colors. I replaced the UI-color claim with the documented behavior: optional policies show status but do not block completion, while required policies block completion until satisfied.

## Review Notes
The post is now accurate for Azure Repos Git rather than GitHub or Bitbucket Cloud PR trigger behavior. Future improvements could add Azure DevOps CLI examples for `az repos policy build create`, but that was outside the scope of correcting the existing article.
