# Validation Summary: How to Publish and Consume NuGet Packages Using Azure Artifacts Feeds

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Artifacts feeds
- NuGet
- .NET SDK and C# class libraries
- Azure Pipelines YAML
- DotNetCoreCLI@2
- NuGetAuthenticate@1
- GitVersion

## Sources Consulted
- Microsoft Learn: What are Azure Artifacts feeds? https://learn.microsoft.com/en-us/azure/devops/artifacts/concepts/feeds
- Microsoft Learn: Feed scopes, project-scoped vs organization-scoped feeds. https://learn.microsoft.com/en-us/azure/devops/artifacts/feeds/project-scoped-feeds
- Microsoft Learn: Connect to Azure Artifacts feeds with dotnet. https://learn.microsoft.com/en-us/azure/devops/artifacts/nuget/dotnet-setup
- Microsoft Learn: DotNetCoreCLI@2 task reference. https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/dotnet-core-cli-v2
- Microsoft Learn: NuGetAuthenticate@1 task reference. https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/nuget-authenticate-v1
- Microsoft Learn: What are feed views? https://learn.microsoft.com/en-us/azure/devops/artifacts/concepts/views
- Microsoft Learn: Azure Artifacts best practices. https://learn.microsoft.com/en-us/azure/devops/artifacts/concepts/best-practices
- GitVersion documentation: Azure DevOps build server support. https://gitversion.net/docs/reference/build-servers/azure-devops

## Issues Found
- The consuming `nuget.config` added both the Azure Artifacts feed and `nuget.org` even though the post recommends configuring nuget.org as an upstream source. I removed the direct `nuget.org` source from the example and clarified that the Azure Artifacts feed should be the only package source when upstream sources are configured, matching Azure Artifacts best practices and avoiding NuGet multi-source resolution ambiguity.
- The GitVersion pipeline example did not disable shallow fetch. GitVersion documentation states that Azure Pipelines must fetch full history, so I added `checkout: self` with `fetchDepth: 0`.
- The troubleshooting section recommended `az artifacts universal login` for local NuGet authentication. The Azure CLI `artifacts universal` command group is for Universal Packages, not NuGet feeds. I replaced it with the documented Azure Artifacts Credential Provider plus `dotnet restore --interactive` flow.
- The test step comment said "if any exist", but the YAML task is not conditional. I clarified that the step expects test projects under the tests folder and should be removed if none exist.

## Review Notes
- The DotNetCoreCLI@2 examples use valid inputs for restore, pack, and push. Microsoft now recommends NuGetAuthenticate@1 as the preferred authentication mechanism; the post already uses it before package consumption and publishing.
- The Azure Artifacts view and retention descriptions align with current Microsoft documentation. Promoted packages are exempt from retention policies.
