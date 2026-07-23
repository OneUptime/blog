# Validation Summary: ACR Private Endpoint DNS: Fixing 403, NXDOMAIN, and Data Endpoint Failures

## Status

validated

## Post Type

Technical troubleshooting guide and Azure CLI tutorial

## Technologies Covered

- Microsoft Azure
- Azure Container Registry (ACR)
- Azure Private Link and private endpoints
- Azure Private DNS
- Azure DNS Private Resolver
- Azure CLI
- Docker Registry HTTP API V2
- Azure DevOps hosted agents, self-hosted agents, and Managed DevOps Pools

## Sources Consulted

- [Connect privately to an Azure container registry by using Azure Private Link](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-endpoints)
- [Azure Container Registry endpoint reference](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-endpoint-reference)
- [Dedicated data endpoints in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-dedicated-data-endpoints)
- [Geo-replication in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication)
- [Configure firewall rules for Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-firewall-rules)
- [Azure CLI reference: `az acr`](https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest)
- [Azure CLI reference: `az network vnet subnet`](https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet?view=azure-cli-latest)
- [Azure CLI reference: private endpoint DNS zone groups](https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group?view=azure-cli-latest)
- [Azure Private Endpoint private DNS zone values](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns)
- [Troubleshoot private endpoint DNS resolution](https://learn.microsoft.com/en-us/troubleshoot/azure/private-link/troubleshoot-private-endpoint-dns-resolution)
- [Troubleshoot conditional forwarder DNS failures in Azure](https://learn.microsoft.com/en-us/troubleshoot/azure/dns/troubleshoot-azure-dns-resolution-fails-conditional-forwarder-misconfiguration)
- [Configure Managed DevOps Pools networking](https://learn.microsoft.com/en-us/azure/devops/managed-devops-pools/configure-networking?view=azure-devops)
- [CNCF Distribution Registry HTTP API V2 specification](https://distribution.github.io/distribution/spec/api/)

## Issues Found

- The endpoint table and layer-failure section said dedicated data endpoints handle both uploads and downloads. Current ACR documentation states that dedicated data endpoints are used only for layer blob downloads; uploads during pushes use the global or regional login server. The table, explanation, and troubleshooting scope were corrected, and push troubleshooting was directed to the login endpoint.
- The post said `az acr show-endpoints` was added to the core Azure CLI in version 2.86.0. The command is GA and is present in earlier CLI releases, including the locally checked Azure CLI 2.71.0. The text now limits the 2.86.0 requirement to working with the Preview regional-endpoint functionality and `az acr login --endpoint`.
- The private-IP capacity example referred ambiguously to a registry with "three replicas." It now explicitly describes three registry regions as the home region plus two added replicas and counts one data endpoint IP per region, matching the official ACR sizing example.
- The `/v2/` probe described HTTP 401 as unconditional. The text now qualifies that response for registries that require authentication; the Registry HTTP API V2 also permits HTTP 200 when access control allows the request.

## Review Notes

- Regional endpoints and the associated Azure CLI options remain Preview as of the validation date. Azure CLI 2.86.0 or later is required for the regional-endpoint workflow.
- The commands, option names, DNS zone name, ACR private-link subresource, record-management approach, DNS resolution path, 403 diagnosis, geo-replica IP sizing, and Managed DevOps Pools networking guidance otherwise match the current official documentation.
- For a future expansion, the post could mention that adding a geo-replica can fail when an existing private endpoint uses static IP configurations and lacks the new region's member configuration. This omission does not make the current dynamic-allocation walkthrough incorrect.
