# Validation Summary: How to Build and Push to a Private ACR from GitHub Actions or Azure DevOps

## Status

validated

## Post Type

Technical guide and CI/CD tutorial

## Technologies Covered

- Azure Container Registry (ACR)
- Azure RBAC and ABAC repository permissions
- Microsoft Entra workload identity federation
- GitHub Actions and OpenID Connect (OIDC)
- Azure DevOps Pipelines and workload identity service connections
- Azure CLI
- Docker and OCI image references
- Azure Private Link, private DNS, and registry firewall rules
- Managed DevOps Pools

## Sources Consulted

- [Azure Container Registry Microsoft Entra permissions and role assignments overview](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Azure ABAC repository permissions in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [Authenticate with an Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication)
- [Azure Container Registry authentication with service principals](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal)
- [Token-based repository permissions in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-token-based-repository-permissions)
- [Connect privately to ACR by using Azure Private Link](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-endpoints)
- [Configure rules to access an Azure Container Registry behind a firewall](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-firewall-rules)
- [Azure Container Registry concepts: tags and manifest digests](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-concepts)
- [Recommendations for tagging and versioning container images](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-image-tag-version)
- [Azure CLI reference: `az acr`](https://learn.microsoft.com/en-us/cli/azure/acr)
- [Azure CLI reference: `az acr manifest`](https://learn.microsoft.com/en-us/cli/azure/acr/manifest)
- [Configure OpenID Connect in Azure for GitHub Actions](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure)
- [Secure use reference for GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub `actions/checkout`](https://github.com/actions/checkout)
- [Azure Login GitHub Action](https://github.com/Azure/login)
- [Set an Azure Resource Manager workload identity service connection](https://learn.microsoft.com/en-us/azure/devops/pipelines/release/configure-workload-identity?view=azure-devops)
- [Convert Azure DevOps issuer service connections to the Microsoft Entra issuer](https://learn.microsoft.com/en-us/azure/devops/pipelines/release/convert-service-connections?view=azure-devops)
- [Azure CLI v2 task reference](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2?view=azure-pipelines)
- [Docker v2 task reference](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2?view=azure-pipelines)
- [Configure networking for Managed DevOps Pools](https://learn.microsoft.com/en-us/azure/devops/managed-devops-pools/configure-networking?view=azure-devops)
- [Docker build command reference](https://docs.docker.com/reference/cli/docker/buildx/build/)

## Issues Found

- The post described a source-commit image tag as immutable. ACR tags are mutable by default, and rebuilding the same commit can produce different image content when inputs such as base-image tags change. Changed the contract, workflow labels, and publishing guidance to call this a commit-SHA or commit-tagged image; clarified that deployments requiring immutability should use a manifest digest or explicitly lock the deployed tag. Renamed the reproducibility heading to describe the section's traceability and repeatability guidance accurately.
- The GitHub Actions example used superseded major versions, `actions/checkout@v4` and `azure/login@v2`. Updated them to the current `actions/checkout@v7` and `azure/login@v3` majors documented on 2026-07-23.

## Review Notes

- The ACR role-assignment mode values, legacy and ABAC data-role behavior, registry-level ABAC condition scope, and the separate control-plane role required for `az acr login` agree with current Microsoft documentation.
- The July 1, 2026 deprecation and July 1, 2027 retirement dates for eligible Azure DevOps issuer service connections are current, including the stated exclusions.
- The GitHub Actions and Azure Pipelines YAML blocks parse successfully, and the extracted Bash blocks pass shell syntax validation.
- All 12 links in the post's Official Documentation section returned HTTP 200 during validation.
- The post correctly identifies `az acr manifest` as Preview and advises pinning and testing the Azure CLI version.
- The examples retain readable major action tags. The post correctly tells production users to replace them with verified full commit SHAs.
