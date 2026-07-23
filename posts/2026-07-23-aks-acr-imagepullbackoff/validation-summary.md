# Validation Summary: ACR ImagePullBackOff in AKS: A Systematic Troubleshooting Guide

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Container Registry (ACR)
- Kubernetes and kubelet image pulling
- Azure managed identities and service principals
- Azure RBAC and ABAC repository permissions
- Azure Private Link, private DNS, firewalls, and registry data endpoints
- Azure CLI, kubectl, and Docker Buildx

## Sources Consulted
- [Troubleshoot image pull failures from Azure Container Registry to AKS](https://learn.microsoft.com/en-us/troubleshoot/azure/azure-kubernetes/connectivity/cannot-pull-image-from-acr-to-aks-cluster)
- [Integrate Azure Container Registry with Azure Kubernetes Service](https://learn.microsoft.com/en-us/azure/aks/cluster-container-registry-integration)
- [Scenarios to authenticate with Azure Container Registry from Kubernetes](https://learn.microsoft.com/en-us/azure/container-registry/authenticate-kubernetes-options)
- [Azure ABAC repository permissions in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [Azure Container Registry permissions and role assignments overview](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Connect privately to an Azure container registry using Azure Private Link](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-endpoints)
- [Configure firewall rules for Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-firewall-rules)
- [Check the health of an Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-check-health)
- [Azure Container Registry SKU features and request limits](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Azure CLI reference: az aks](https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest)
- [Azure CLI reference: az acr](https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest)
- [Azure CLI reference: az acr manifest](https://learn.microsoft.com/en-us/cli/azure/acr/manifest?view=azure-cli-latest)
- [Azure CLI reference: az acr repository](https://learn.microsoft.com/en-us/cli/azure/acr/repository?view=azure-cli-latest)
- [Azure CLI reference: az role assignment](https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest)
- [Azure CLI release notes](https://learn.microsoft.com/en-us/cli/azure/release-notes-azure-cli?view=azure-cli-latest)
- [Azure Container Registry REST API: Registries - Get](https://learn.microsoft.com/en-us/rest/api/container-registry/registries/get?view=rest-container-registry-2025-11-01)
- [Kubernetes documentation: Images](https://kubernetes.io/docs/concepts/containers/images/)
- [Kubernetes documentation: Pull an image from a private registry](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/)
- [Docker documentation: docker buildx imagetools inspect](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/)

## Issues Found
No technical issues found.

## Review Notes
- The `az acr manifest` command group remains in Preview as of the validation date.
- `az acr show-endpoints` is a Core, GA command and requires Azure CLI 2.86.0 or later, matching the post.
- The documented `roleAssignmentMode` values, the separate role requirements for legacy RBAC and ABAC-enabled registries, and the lack of `--attach-acr` support for ABAC-enabled registries are current.
- Private Link automatically enables dedicated data endpoints, and private DNS must cover the registry endpoint and the data endpoint for every applicable replica.
- ACR API throttling returns HTTP 429 with a `Retry-After` header, while `pull QPS exceeded` is a kubelet-side pull-rate error; the post distinguishes these correctly.
