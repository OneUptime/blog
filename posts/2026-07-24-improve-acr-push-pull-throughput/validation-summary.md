# Validation Summary: Why ACR Pushes and Pulls Are Slow—and How to Improve Throughput

## Status
validated

## Post Type
Technical performance troubleshooting guide

## Technologies Covered
- Microsoft Azure
- Azure Container Registry (ACR)
- Azure CLI
- Docker and Dockerfiles
- OCI container images and registries
- Kubernetes
- Node.js and npm
- Azure Private Link, private endpoints, dedicated data endpoints, and geo-replication
- Azure Monitor metrics

## Sources Consulted
- [Troubleshoot registry performance](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-troubleshoot-performance)
- [Azure Container Registry SKU features and limits](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Best practices for Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-best-practices)
- [Geo-replication in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication)
- [Dedicated data endpoints for Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-dedicated-data-endpoints)
- [Connect privately to an Azure container registry using Azure Private Link](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-endpoints)
- [Check the health of an Azure container registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-check-health)
- [Azure CLI `az acr` reference](https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest)
- [Azure CLI `az acr replication` reference](https://learn.microsoft.com/en-us/cli/azure/acr/replication?view=azure-cli-latest)
- [Supported Azure Monitor metrics for Microsoft.ContainerRegistry/registries](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-containerregistry-registries-metrics)
- [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)
- [Docker `image pull` reference](https://docs.docker.com/reference/cli/docker/image/pull/)
- [Docker `image push` reference](https://docs.docker.com/reference/cli/docker/image/push/)
- [Docker build-cache optimization](https://docs.docker.com/build/cache/optimize/)
- [Dockerfile building best practices](https://docs.docker.com/build/building/best-practices/)
- [Kubernetes container image documentation](https://kubernetes.io/docs/concepts/containers/images/)
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)

## Issues Found
- The pull sequence said that the client always resolves a tag to a manifest. Digest references do not resolve a tag, and the post's benchmark deliberately pulls by digest. Changed this to say that the client resolves the image reference to a manifest.
- The geo-replication guidance said to "publish by digest." The Docker push command accepts an image name with an optional tag and reports the resulting digest; consumers can then pull or deploy that immutable digest. Changed the guidance to "deploy by digest."

## Review Notes
- ACR regional endpoints are documented as Preview as of 2026-07-25. Their built-in Azure CLI commands require Azure CLI 2.86.0 or later, and their lifecycle status should be rechecked before production adoption.
- ACR's published API rate limits are best-effort approximate maximums rather than SLA-backed guarantees. The post correctly directs readers to the current service-tier table instead of embedding values.
- `node:24-alpine` is a valid current image family, and Node.js 24 is in LTS. The tag is floating, so the post's advice to review runtime support and pin production base images by digest remains important.
- The remaining Azure CLI commands, endpoint patterns, Dockerfile instructions, Kubernetes behavior, metrics, and documentation links matched the current official references.
