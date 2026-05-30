# Validation Summary: How to Set Up Azure Pipelines Multi-Repository Triggers for Cross-Repo Build

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Pipelines
- Azure Repos Git
- Multi-repository checkout
- Repository resource triggers
- GitHub repository resources
- YAML pipeline configuration
- .NET and NuGet Azure Pipelines tasks

## Sources Consulted
- Microsoft Learn: resources.repositories.repository definition - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/resources-repositories-repository?view=azure-pipelines
- Microsoft Learn: Check out multiple repositories in your pipeline - https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/multi-repo-checkout?view=azure-devops
- Microsoft Learn: trigger definition - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/trigger?view=azure-pipelines
- Microsoft Learn: Build Azure Repos Git or TFS Git repositories - https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/azure-repos-git?view=azure-devops
- Microsoft Learn: Resources in YAML pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/resources?view=azure-devops
- Microsoft Learn: NuGetCommand@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/nuget-command-v2?view=azure-pipelines

## Issues Found
- The post implied that repository resource triggers work across all repository resource types, including GitHub. Microsoft documentation states that repository resource triggers only work for Azure Repos Git repositories in the same organization, and do not work for GitHub or Bitbucket repository resources. I narrowed the trigger language to Azure Repos Git and changed the GitHub section to describe multi-repo checkout rather than GitHub resource triggering.
- The trigger-source explanation stated that `Build.Repository.Name` was only for the self repository. Microsoft documentation states that repository-triggered runs set `Build.Repository.Name`, `Build.SourceBranch`, and related variables based on the triggering repository. I corrected that explanation.
- The conditional build example checked out only the `sharedLib` repository in a job but then used project globs under `shared-library/**`. With a single checkout step, Azure Pipelines checks out the selected repository at the normal sources root unless an explicit path is set. I added `path: s/shared-library` to make the subsequent project paths valid.
- The specific-ref example described the checkout as a branch checkout even though the resource was pinned to a tag. I corrected the comment to match the tag-based ref behavior and noted the triggering-repository exception.

## Review Notes
The examples use concise illustrative feed names and repository names. In a real pipeline, Azure Artifacts feed identifiers and cross-project repository access permissions may need to be adjusted for the organization and project configuration.
