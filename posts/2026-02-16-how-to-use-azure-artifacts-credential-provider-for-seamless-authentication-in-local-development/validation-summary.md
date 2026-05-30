# Validation Summary: How to Use Azure Artifacts Credential Provider for Seamless Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Artifacts
- Azure Artifacts Credential Provider
- NuGet, dotnet CLI, NuGet.exe, and MSBuild
- npm and .npmrc authentication
- pip, keyring, and artifacts-keyring
- Docker multi-stage builds
- Azure DevOps Pipelines NuGetAuthenticate task

## Sources Consulted
- Azure Artifacts Credential Provider README: https://github.com/microsoft/artifacts-credprovider
- Microsoft Learn, Connect to an Azure Artifacts feed with dotnet: https://learn.microsoft.com/en-us/azure/devops/artifacts/nuget/dotnet-setup
- Microsoft Learn, Consuming packages from authenticated feeds: https://learn.microsoft.com/en-us/nuget/consume-packages/consuming-packages-authenticated-feeds
- Microsoft Learn, Connect to an Azure Artifacts feed with npm: https://learn.microsoft.com/en-us/azure/devops/artifacts/npm/npmrc
- Microsoft Learn, Consume packages from PyPI with Azure Artifacts: https://learn.microsoft.com/en-us/azure/devops/artifacts/python/use-packages-from-pypi
- Microsoft artifacts-keyring README: https://github.com/microsoft/artifacts-keyring
- Microsoft dotnet-docker, Managing NuGet credentials in Docker scenarios: https://github.com/dotnet/dotnet-docker/blob/main/documentation/scenarios/nuget-credentials.md

## Issues Found
- The post described the Azure Artifacts Credential Provider as a direct plugin for npm and pip. Updated the description to state that it directly supports NuGet-based tools, while npm and pip use their own Azure Artifacts authentication helpers.
- The `dotnet restore` first-run example omitted `--interactive`. Updated it to `dotnet restore --interactive`, matching NuGet and Azure Artifacts guidance for first-time interactive authentication.
- The npm section incorrectly implied the credential provider could be used directly with npm and recommended `ado-npm-auth` as the cross-platform path. Reworked the section to match official guidance: `vsts-npm-auth` on Windows, project-level `.npmrc` for registry configuration, and user-level `.npmrc` credentials for cross-platform use.
- The pip setup installed only `artifacts-keyring`. Updated the command to install both `keyring` and `artifacts-keyring`, and clarified that Azure Artifacts may prompt for a PAT-backed credential on first use.
- The non-interactive section labeled a PAT/token environment variable example as device-code flow. Updated it to describe explicit token-based unattended authentication and switched to the preferred `ARTIFACTS_CREDENTIALPROVIDER_*` environment variables.
- The service principal example used generic Azure SDK environment variables with a client secret, which is not the documented Credential Provider configuration. Replaced it with `ARTIFACTS_CREDENTIALPROVIDER_FEED_ENDPOINTS` using `clientId` and a certificate path.
- The Docker example used the legacy `VSS_NUGET_EXTERNAL_FEED_ENDPOINTS` variable and omitted a username. Updated it to use the preferred `ARTIFACTS_CREDENTIALPROVIDER_EXTERNAL_FEED_ENDPOINTS` variable with a username and token.
- The Docker build command used `az account get-access-token`, which produces an Azure access token that is not the documented feed token for this pattern. Updated the command to pass an existing feed access token, such as a PAT or Azure Pipelines `NuGetAuthenticate` token.
- A troubleshooting note implied npm stale credentials conflict with the Credential Provider. Updated it to describe conflicts between user-level credentials and project-level registry entries.

## Review Notes
The article is now technically accurate for the documented NuGet Credential Provider workflow. The Docker pattern still uses build arguments, which Microsoft documents as a usable pattern, but Docker BuildKit secrets would be a stronger future improvement for reducing local build-layer exposure.
