# Validation Summary: Basic, Standard, or Premium? Choosing the Right Azure Container Registry Tier

## Status

validated

## Post Type

Technical guide and cloud architecture decision guide

## Technologies Covered

- Microsoft Azure
- Azure Container Registry (ACR)
- Azure CLI
- Azure Private Link and private endpoints
- Azure availability zones and ACR geo-replication
- Microsoft Entra ID, Azure RBAC, and Azure ABAC
- Docker and OCI registry operations
- Azure Monitor metrics
- Azure Kubernetes Service (AKS), Azure Container Apps, and Azure App Service

## Sources Consulted

- [Azure Container Registry SKU features and limits](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Zone redundancy in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/zone-redundancy)
- [Container image storage in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-storage)
- [Azure Container Registry pricing](https://azure.microsoft.com/en-us/pricing/details/container-registry/)
- [Connect privately to an Azure container registry by using Azure Private Link](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-endpoints)
- [Geo-replication in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication)
- [Best practices for Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-best-practices)
- [Azure CLI `az acr` command reference](https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest)
- [Azure Container Registry Registries - Get REST API](https://learn.microsoft.com/en-us/rest/api/container-registry/registries/get?view=rest-container-registry-2025-11-01)
- [Supported Azure Monitor metrics for Microsoft.ContainerRegistry/registries](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-containerregistry-registries-metrics)
- [Microsoft Entra ABAC repository permissions in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [Non-Microsoft Entra token-based repository permissions](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-token-based-repository-permissions)
- [Manage signed images by using Docker Content Trust](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-content-trust)
- [Transition from Docker Content Trust to Notary Project](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-content-trust-deprecation)
- [Artifact streaming in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-artifact-streaming)
- [Retention policy for untagged manifests](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-retention-policy)
- [Dedicated agent pools for Azure Container Registry Tasks](https://learn.microsoft.com/en-us/azure/container-registry/tasks-agent-pools)
- [CNCF Distribution Registry HTTP API V2](https://distribution.github.io/distribution/spec/api/)

## Issues Found

- The post described the published per-tier storage limits as hard maximums. Azure documents 40 TiB for Basic and Standard and 100 TiB for Premium as the normal registry storage limits, but also directs customers who need more storage to contact Azure Support. Changed “hard storage limit” and “Maximum registry storage” to “documented storage limit” so the wording does not imply that a support-approved increase is impossible.
- The pull-flow explanation said every client authenticates. Standard and Premium registries can permit anonymous pulls, so authentication is configuration-dependent. Changed the sentence to say that a client may authenticate before requesting the manifest or index and missing layers.
- Artifact streaming, the retention policy for untagged manifests, and dedicated ACR Tasks agent pools are Premium-only but remain preview features. Marked artifact streaming as preview in the tier table and added the current preview status of all three features to the Premium feature discussion.

## Review Notes

- The current ACR SKU matrix, updated June 16, 2026, lists artifact cache rules as unavailable on Basic and supported on Standard and Premium. The separate artifact-cache overview, updated April 14, 2026, still says the feature is available on all three tiers. The post follows the newer, tier-specific SKU matrix; this Microsoft documentation inconsistency should be rechecked if the post is updated later.
- The documented API request-rate limits group Basic and Standard together, while the service-tier overview still states that Standard provides higher image throughput than Basic. The post correctly avoids inventing numeric concurrency or bandwidth values.
- The `az acr show`, `az acr show-usage`, and `az acr update --sku Premium` syntax is current. The queried `sku.name`, `location`, `provisioningState`, `publicNetworkAccess`, and `dataEndpointEnabled` fields are present in the current registry resource schema.
- Docker Content Trust has been deprecated since March 31, 2025, cannot be newly enabled after May 31, 2026 on registries that had not enabled it previously, and is scheduled for complete removal on March 31, 2028. The post's lifecycle warning is accurate.
