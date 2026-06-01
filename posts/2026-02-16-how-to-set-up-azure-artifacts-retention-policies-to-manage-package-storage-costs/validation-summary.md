# Validation Summary: How to Set Up Azure Artifacts Retention Policies to Manage Package Storage Costs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Artifacts
- Azure DevOps REST API
- Azure Pipelines YAML
- NuGet packages
- PowerShell
- Bash, curl, and jq
- Azure Artifacts upstream sources and feed views

## Sources Consulted
- Microsoft Learn: Delete and recover packages in Azure Artifacts: https://learn.microsoft.com/en-us/azure/devops/artifacts/how-to/delete-and-recover-packages?view=azure-devops
- Microsoft Learn: Retention Policies - Set Retention Policy REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/artifacts/retention-policies/set-retention-policy?view=azure-devops-rest-7.1
- Microsoft Learn: Feed Management - Get Feeds REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/artifacts/feed-management/get-feeds?view=azure-devops-rest-7.1
- Microsoft Learn: Feed Management - Create Feed REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/artifacts/feed-management/create-feed?view=azure-devops-rest-7.1
- Microsoft Learn: Artifact Details - Get Packages REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/artifacts/artifact-details/get-packages?view=azure-devops-rest-7.1
- Microsoft Learn: Artifact Details - Get Package Versions REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/artifacts/artifact-details/get-package-versions?view=azure-devops-rest-7.1
- Microsoft Learn: NuGet - Update Package Version REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/artifactspackagetypes/nuget/update-package-version?view=azure-devops-rest-7.1
- Microsoft Learn: NuGet - Delete Package Version REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/artifactspackagetypes/nuget/delete-package-version?view=azure-devops-rest-7.1
- Microsoft Learn: What are upstream sources?: https://learn.microsoft.com/en-us/azure/devops/artifacts/concepts/upstream-sources?view=azure-devops

## Issues Found
- Corrected the free storage wording from "2 GB" to "2 GiB of Azure Artifacts storage for free per organization" to match Microsoft documentation.
- Added Cargo to the list of Azure Artifacts package types covered by deletion and retention documentation.
- Replaced unsupported `az artifacts feed` and `az artifacts package` CLI examples with documented Azure DevOps REST API calls.
- Corrected the retention policy explanation from "recently published/created" to "recently downloaded"; Azure Artifacts retention uses the latest download window, not creation date.
- Corrected the retention policy REST example from `PATCH` with `daysToKeepRecentlyCreatedPackages` and `api-version=7.0` to `PUT` with `daysToKeepRecentlyDownloadedPackages` and `api-version=7.1`.
- Updated the UI instructions to use Feed details and the "Days to keep recently downloaded packages" label from the current Azure Artifacts UI documentation.
- Updated NuGet package promotion API examples to use `api-version=7.1`.
- Replaced the AzureCLI promotion task with a `curl` script using the documented NuGet package version update endpoint.
- Fixed the cleanup script to target NuGet packages explicitly and to use the documented package listing, version listing, and NuGet package delete endpoints.
- Updated the monitoring script to use documented feed and package list REST APIs instead of unavailable Azure Artifacts CLI commands.

## Review Notes
- The local environment did not have Azure CLI or PowerShell installed, so CLI help and PowerShell parsing could not be run locally. API and command corrections were verified against current Microsoft Learn documentation.
- The cleanup script is intentionally scoped to NuGet because Azure DevOps package deletion endpoints are package-type-specific.
