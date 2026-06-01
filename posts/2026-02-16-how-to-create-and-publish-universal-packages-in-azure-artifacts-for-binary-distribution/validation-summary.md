# Validation Summary: How to Create and Publish Universal Packages in Azure Artifacts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Artifacts Universal Packages
- Azure CLI Azure DevOps extension
- Azure Pipelines YAML
- UniversalPackages@0 pipeline task
- Azure DevOps Artifacts REST API
- Semantic versioning
- Go cross-compilation
- .NET publish

## Sources Consulted
- Microsoft Learn: Azure CLI `az artifacts universal` reference - https://learn.microsoft.com/en-us/cli/azure/artifacts/universal?view=azure-cli-latest
- Microsoft Learn: Publish Universal Packages from Azure Artifacts feeds - https://learn.microsoft.com/en-us/azure/devops/artifacts/quickstarts/universal-packages?view=azure-devops
- Microsoft Learn: Download Universal Packages from Azure Artifacts feeds - https://learn.microsoft.com/en-us/azure/devops/artifacts/quickstarts/download-universal-packages?view=azure-devops
- Microsoft Learn: UniversalPackages@0 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/universal-packages-v0?view=azure-pipelines
- Microsoft Learn: Promote packages and manage feed views - https://learn.microsoft.com/en-us/azure/devops/artifacts/feeds/views?view=azure-devops
- Microsoft Learn: Artifact Details - Get Packages REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/artifacts/artifact-details/get-packages?view=azure-devops-rest-7.1
- Microsoft Learn: Universal - Delete Package Version REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/artifactspackagetypes/universal/delete-package-version?view=azure-devops-rest-7.1

## Issues Found
- The post used lowercase default feed view names (`@local`, `@prerelease`, `@release`). Updated them to the documented default view names: `@Local`, `@Prerelease`, and `@Release`.
- The Azure Pipelines examples used bare feed names for project-scoped feeds. Updated the UniversalPackages@0 examples to use the documented `Project/Feed` format for project-scoped feeds.
- The post showed `az artifacts universal list`, but the official Azure CLI reference only exposes `publish` and `download` under `az artifacts universal`. Replaced the example with the documented Artifact Details REST API for listing packages with all versions.
- The feed view download example used a nonexistent `vstsFeedPackageVersion` task input. Removed that input and changed the wording to download the promoted version explicitly.
- The REST promotion example used an older API version. Updated it to the documented `7.2-preview.1` endpoint used for package view promotion.
- The ML model pipeline used `$(Build.BuildNumber)` as a Universal Package version, which can produce a value that does not satisfy Universal Package version requirements. Changed it to `0.0.$(Build.BuildId)`.
- The post showed `az artifacts universal delete`, but that CLI subcommand is not documented. Replaced it with the documented Universal Package Version REST delete endpoint.

## Review Notes
- The local environment did not have `az` installed, so CLI command verification was performed against official Microsoft Learn documentation rather than local `az --help` output.
- Microsoft documents that wildcard version downloads are supported for latest stable versions, but wildcard patterns are not supported with prerelease package versions.
