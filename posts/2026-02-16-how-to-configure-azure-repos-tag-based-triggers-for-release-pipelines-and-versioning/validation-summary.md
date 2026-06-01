# Validation Summary: How to Configure Azure Repos Tag-Based Triggers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Repos
- Azure Pipelines YAML triggers
- Git tags
- Semantic Versioning
- Azure Pipelines predefined variables
- Azure Pipelines .NET, NuGet, build artifact, and checkout tasks
- Bash scripting in pipeline steps

## Sources Consulted
- Microsoft Learn: Azure Repos Git CI triggers and tag filters - https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/azure-repos-git?view=azure-devops
- Microsoft Learn: Azure Pipelines `trigger` YAML schema - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/trigger?view=azure-pipelines
- Microsoft Learn: Azure Pipelines predefined variables - https://learn.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops
- Microsoft Learn: Azure Pipelines expressions - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/expressions?view=azure-devops
- Microsoft Learn: Azure Pipelines conditions - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/conditions?view=azure-devops
- Microsoft Learn: Azure Pipelines checkout step and `fetchTags` - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/steps-checkout?view=azure-pipelines
- Microsoft Learn: DotNetCoreCLI@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/dotnet-core-cli-v2?view=azure-pipelines
- Microsoft Learn: NuGetCommand@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/nuget-command-v2?view=azure-pipelines
- Microsoft Learn: Publish build artifacts - https://learn.microsoft.com/en-us/azure/devops/pipelines/artifacts/build-artifacts
- Microsoft Learn: DownloadBuildArtifacts@1 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/download-build-artifacts-v1?view=azure-pipelines
- Git documentation: `git tag` - https://git-scm.com/docs/git-tag
- Git documentation: `git push` - https://git-scm.com/docs/git-push
- Semantic Versioning specification - https://semver.org/

## Issues Found
- The examples used `branches: include: none` to suppress branch triggers. Azure Pipelines does not use `none` that way inside `branches`; tag filters can be specified directly, and combining branch and tag filters can cause the trigger to fire when either filter is satisfied. Removed the `branches` blocks from tag-only trigger examples.
- The semantic-version tag trigger example used regex-like patterns such as `v[0-9]+.[0-9]+.[0-9]+`, but Azure Repos trigger filters use wildcard matching, not regular expressions. Changed the trigger to a broad `v*` filter and added SemVer validation inside the pipeline script.
- The multi-stage pipeline stripped every `v` from `Build.SourceBranchName`, which could alter version metadata or prerelease labels. Changed it to strip the `refs/tags/v` prefix from `Build.SourceBranch`.
- The package artifact flow packed NuGet packages without placing them in `$(Build.ArtifactStagingDirectory)`, then published that directory. Added `outputDir` to the pack task and explicit download/push paths for the publish stage.
- Git commands that depend on tags used full history but did not explicitly sync tags. Added `fetchTags: true` where tag history, previous-tag lookup, or tag metadata is required.
- The "Creating GitHub-Style Releases" section claimed the snippet used the Azure DevOps REST API to create a release annotation, but the code only generated and published a changelog artifact. Renamed the section and corrected the explanation.
- The tag-author validation example assumed tag metadata would exist and used word matching for email addresses. Added checkout with tags, a failure path for lightweight tags or missing tagger email, and exact-line email matching.
- A later governance paragraph repeated the regex-style trigger pattern. Updated it to recommend broad `v` tag triggering plus in-pipeline SemVer validation.

## Review Notes
The examples are illustrative and still use placeholder project paths, package feed names, environments, and simplistic version-increment logic. Production pipelines should replace those placeholders and use a dedicated versioning tool for complex release rules.
