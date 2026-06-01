# Validation Summary: Configure Azure DevOps Organization Settings for Cross-Project Pipeline Access

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Azure DevOps
- Azure Pipelines
- Azure Repos
- Azure Artifacts
- Azure DevOps CLI
- Azure Pipelines service connections
- Azure Pipelines environments
- Azure Pipelines agent pools
- Azure Pipelines variable groups
- YAML pipeline configuration
- NuGetAuthenticate@1
- dotnet CLI

## Sources Consulted
- Microsoft Learn: Access repositories, artifacts, and other resources - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/access-tokens?view=azure-devops
- Microsoft Learn: Securely access repositories from pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/security/secure-access-to-repos?view=azure-devops
- Microsoft Learn: Check out multiple repositories in your pipeline - https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/multi-repo-checkout?view=azure-devops
- Microsoft Learn: Manage permissions - Azure Artifacts - https://learn.microsoft.com/en-us/azure/devops/artifacts/feeds/feed-permissions?view=azure-devops
- Microsoft Learn: NuGetAuthenticate@1 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/nuget-authenticate-v1?view=azure-pipelines
- Microsoft Learn: Manage security in Azure Pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/policies/permissions?view=azure-devops
- Microsoft Learn: Create and target Azure DevOps environments - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/environments?view=azure-devops
- Microsoft Learn: Azure DevOps CLI az devops invoke - https://learn.microsoft.com/en-us/cli/azure/devops?view=azure-cli-latest

## Issues Found
- The post incorrectly stated that Azure DevOps restricts pipeline access to same-project resources by default. Updated this to describe job access tokens, collection-scoped identities, project-scoped identities, and explicit resource permissions.
- The job authorization scope explanation was inaccurate. Updated it to explain that limiting job authorization scope uses a project-scoped identity and that secure cross-project access requires granting that identity permissions in the target project.
- The post claimed project settings can disable an organization-enforced job authorization limit. Updated this because Microsoft documents that project settings cannot override an enabled organization-level setting.
- The repository access steps omitted target project visibility. Added the need to grant the source build identity View project-level information in the target project when using project-scoped identities.
- The Azure Artifacts section assigned the Collaborator role for publishing. Corrected this to Feed Publisher (Contributor), with Feed Reader for consume and Collaborator for upstream-save scenarios.
- The NuGetAuthenticate@1 example used `nuGetServiceConnections` for a same-organization feed. Removed that input and noted that same-organization Azure Artifacts feeds are authenticated automatically; service connections are for feeds outside the organization or third-party repositories.
- The service connection section claimed service connections can be made organization-scoped at creation. Replaced this with the documented sharing model: project permissions for sharing and pipeline permissions for selected or open pipeline access.
- The environments section incorrectly claimed environments can be shared across projects. Updated it to state that Azure DevOps environments are project-scoped YAML pipeline resources and that teams should centralize deployment pipelines or create matching environments per project.
- The agent pool section implied project-scoped pools can be granted for cross-project use. Updated it to state that organization-scoped pools are appropriate for multi-project use and project-scoped pools are only available in their owning project.
- The security recommendations still advised disabling job authorization scope limits. Updated the recommendation to prefer project-scoped job authorization and explicit target-project permissions.

## Review Notes
The corrected YAML snippets are syntactically valid for Azure Pipelines. The Azure DevOps CLI was not installed in the local environment, so CLI verification was performed against the official Azure CLI documentation rather than local `az --help` output.
