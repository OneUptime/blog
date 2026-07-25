# Validation Summary: ACR Zone Redundancy vs. Geo-Replication: Availability, Latency, and Cost

## Status

validated

## Post Type

Technical guide and architectural comparison

## Technologies Covered

- Microsoft Azure
- Azure Container Registry (ACR)
- ACR zone redundancy
- ACR geo-replication
- ACR global, regional, and dedicated data endpoints
- Azure Private Link, private endpoints, private DNS, and firewall rules
- Azure CLI
- Kubernetes Deployments and digest-pinned container images
- OCI/Docker Registry image manifests and digests

## Sources Consulted

- [Zone redundancy in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/zone-redundancy)
- [Geo-replication in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication)
- [Reliability in Azure Container Registry](https://learn.microsoft.com/en-us/azure/reliability/reliability-container-registry)
- [Azure Container Registry endpoint reference](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-endpoint-reference)
- [Connect privately to an Azure container registry using Azure Private Link](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-endpoints)
- [Configure rules to access an Azure container registry behind a firewall](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-firewall-rules)
- [Container image storage in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-storage)
- [Azure Container Registry SKU features and limits](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Azure Container Registry pricing](https://azure.microsoft.com/en-us/pricing/details/container-registry/)
- [Azure CLI: `az acr`](https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest)
- [Azure CLI: `az acr replication`](https://learn.microsoft.com/en-us/cli/azure/acr/replication?view=azure-cli-latest)
- [Kubernetes container images](https://kubernetes.io/docs/concepts/containers/images/)
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [CNCF Distribution HTTP API V2](https://distribution.github.io/distribution/spec/api/)

## Issues Found

- The networking section stated categorically that private DNS zones and firewall rules must include every newly added replica endpoint. Microsoft documents manual DNS updates specifically for manually managed private DNS records, while firewall requirements depend on which endpoint surfaces clients use. The sentence was revised to preserve those conditions and to distinguish data endpoints from optional regional endpoints.
- The CLI paragraph did not explicitly distinguish the renamed per-replica `--global-endpoint-routing` flag from the registry-level `--regional-endpoints` flag. The wording was clarified because the former controls participation in global routing, while the latter enables preview regional endpoint URLs.

## Review Notes

- Regional endpoints remain a preview feature as of the validation date and require Azure CLI 2.86.0 or later.
- The documented rename from `--region-endpoint-enabled` to `--global-endpoint-routing` in Azure CLI 2.86.0, and removal of the old flag in Azure CLI 2.87.0 in June 2026, are accurate.
- The Kubernetes image digest is intentionally shown as a replacement placeholder; it must be replaced with the actual manifest digest before deployment.
