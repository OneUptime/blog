# Validation Summary: How to Configure Azure Artifacts Feed Views for Promoting Packages Across

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Artifacts feed views
- Azure DevOps Pipelines
- Azure DevOps REST API
- NuGet packages
- npm packages
- Azure Artifacts permissions
- Azure Artifacts retention policies

## Sources Consulted
- Microsoft Learn: What are feed views? https://learn.microsoft.com/en-us/azure/devops/artifacts/concepts/views?view=azure-devops
- Microsoft Learn: Promote packages and manage feed views. https://learn.microsoft.com/en-us/azure/devops/artifacts/feeds/views?view=azure-devops
- Microsoft Learn: NuGet - Update Package Version REST API. https://learn.microsoft.com/en-us/rest/api/azure/devops/artifactspackagetypes/nuget/update-package-version?view=azure-devops-rest-7.1
- Microsoft Learn: NuGet - Update Package Versions REST API. https://learn.microsoft.com/en-us/rest/api/azure/devops/artifactspackagetypes/nuget/update-package-versions?view=azure-devops-rest-7.1
- Microsoft Learn: NuGetCommand@2 task reference. https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/nuget-command-v2?view=azure-pipelines
- Microsoft Learn: UniversalPackages@0 task reference. https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/universal-packages-v0?view=azure-pipelines
- Microsoft Learn: Azure CLI az artifacts universal reference. https://learn.microsoft.com/en-us/cli/azure/artifacts/universal?view=azure-cli-latest
- Microsoft Learn: Manage permissions in Azure Artifacts. https://learn.microsoft.com/en-us/azure/devops/artifacts/feeds/feed-permissions?view=azure-devops
- Microsoft Learn: Connect to an Azure Artifacts feed - npm. https://learn.microsoft.com/en-us/azure/devops/artifacts/npm/npmrc?view=azure-devops
- Microsoft Learn: Delete and recover packages / retention policies. https://learn.microsoft.com/en-us/azure/devops/artifacts/how-to/delete-and-recover-packages?view=azure-devops

## Issues Found
- The pipeline used `UniversalPackages@0` with `command: promote`, `packageName`, `packageVersion`, and `viewId` inputs to promote a NuGet package. The official task supports download and publish for Universal Packages, not promotion. Replaced those steps with REST API `PATCH` calls against the documented NuGet package version endpoint.
- The REST API example used `api-version=7.1` for a PATCH promotion. Current Microsoft guidance for feed-view promotion examples uses preview package-version update endpoints. Updated the examples to `api-version=7.2-preview.1`.
- The post said all three default views could be renamed and gave an example of renaming Local. Microsoft documents `@Prerelease` and `@Release` as suggested views that can be renamed or deleted, while `@Local` is the default view where packages published to the base feed appear. Adjusted the portal guidance.
- The permissions section said Feed Publisher (Contributor) can publish but not promote. Microsoft documents that Feed Publisher (Contributor) can publish and promote packages. Corrected the role descriptions and distinguished Feed Reader from Feed and Upstream Reader.
- The npm example used `az artifacts universal promote` to promote an npm package. The Azure CLI `az artifacts universal` group manages Universal Packages and exposes download/publish commands, not npm promotion. Replaced it with the documented REST API promotion pattern for npm package versions.
- The retention advice implied separate retention settings per view. Azure Artifacts retention is configured at the feed level, and packages promoted to a view are exempt from retention policies. Updated the recommendation accordingly.
- Added a SemVer-compatible pipeline run name so the `byBuildNumber` NuGet versioning example and later `$(Build.BuildNumber)` promotion references align.

## Review Notes
The post is technically relevant and salvageable. The corrected examples still use placeholder feed, organization, project, package, and version names that must be replaced for a real Azure DevOps organization. Scoped npm package names may need URL encoding when used in REST API paths.
