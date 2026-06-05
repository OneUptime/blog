# Validation Summary: How to Push Docker Images to Azure Container Registry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Registry
- Azure CLI
- Docker
- GitHub Actions
- Azure Kubernetes Service
- Azure RBAC and service principals
- ACR Tasks and ACR Build

## Sources Consulted
- Azure Container Registry SKU features and limits: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus
- Azure Container Registry authentication options: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Azure Container Registry service principal authentication: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal
- Azure CLI `az acr repository` reference: https://learn.microsoft.com/en-us/cli/azure/acr/repository
- Azure CLI `az acr manifest` reference: https://learn.microsoft.com/en-us/cli/azure/acr/manifest
- Azure Container Registry retention policy: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-retention-policy
- Azure Container Registry purge task documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auto-purge
- Azure Container Registry Docker Content Trust documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-content-trust
- Azure Container Registry and AKS integration: https://learn.microsoft.com/en-us/azure/aks/cluster-container-registry-integration
- Azure Login GitHub Action: https://github.com/Azure/login
- Docker Login GitHub Action: https://github.com/docker/login-action

## Issues Found
- The post described Content Trust as a current general ACR feature and recommended enabling it. Docker Content Trust is deprecated and cannot be enabled on new registries after May 31, 2026, so the intro, SKU summary, and security example were updated to avoid recommending it for new workflows.
- The Standard SKU bullet implied webhooks were a Standard-only feature. Microsoft documents webhook integration as a common ACR feature, so the bullet was changed to mention higher throughput instead.
- The manifest inspection command used `az acr repository show-manifests`, which is not in the current Azure CLI repository command reference. It was replaced with `az acr manifest list-metadata`.
- The GitHub Actions registry login example used the unmaintained Azure Docker Login action. It was updated to the maintained `docker/login-action@v4` syntax.
- The OIDC workflow used `azure/login@v2`. It was updated to `azure/login@v3`.
- The cleanup section labeled `az acr repository delete --image` as deleting a specific tag. That command deletes the manifest referenced by the tag and any other tags pointing to that manifest, so it was replaced with `az acr repository untag` for tag removal.

## Review Notes
The core ACR creation, Docker build/tag/push, ACR Build, service principal, AKS `--attach-acr`, geo-replication, purge, retention policy, and network restriction examples are consistent with current documentation. The local environment did not have the Azure CLI installed, so CLI validation was performed against Microsoft Learn command references rather than local `az --help` output.
