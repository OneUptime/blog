# Validation Summary: How to Configure ACR Geo-Replication with Automatic Failover

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Container Registry
- ACR geo-replication
- ACR zone redundancy
- Azure CLI
- Azure Monitor
- Azure Service Health
- Azure Kubernetes Service
- Kubernetes manifests

## Sources Consulted
- Microsoft Learn: Geo-replication in Azure Container Registry - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication
- Microsoft Learn: Zone redundancy in Azure Container Registry - https://learn.microsoft.com/en-us/azure/container-registry/zone-redundancy
- Microsoft Learn: az acr replication CLI reference - https://learn.microsoft.com/en-us/cli/azure/acr/replication
- Microsoft Learn: az acr artifact-streaming CLI reference - https://learn.microsoft.com/en-us/cli/azure/acr/artifact-streaming
- Microsoft Learn: Artifact streaming in Azure Container Registry - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-artifact-streaming
- Microsoft Learn: az acr webhook CLI reference - https://learn.microsoft.com/en-us/cli/azure/acr/webhook
- Microsoft Learn: Azure Container Registry supported metrics - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-containerregistry-registries-metrics
- Microsoft Learn: Monitor Azure Container Registry - https://learn.microsoft.com/en-us/azure/container-registry/monitor-container-registry
- Microsoft Learn: Configure Service Health alerts for Azure Container Registry - https://learn.microsoft.com/en-us/azure/container-registry/set-container-registry-service-health-alerts
- Microsoft Learn: Dedicated data endpoints in Azure Container Registry - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-dedicated-data-endpoints
- Microsoft Learn: Automatically purge images from an Azure container registry - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auto-purge

## Issues Found
- The architecture diagram described East US as a primary replica and other regions as secondary replicas. ACR geo-replication uses active-active geo-replicas, so the diagram labels were changed to geo-replica terminology.
- The zone redundancy section described zone redundancy as an opt-in setting and said existing replications must be deleted and recreated. Current Microsoft guidance says zone redundancy is enabled by default in supported regions and the `zoneRedundancy` property is now a legacy artifact, so the text and commands were updated.
- The failover test used `az acr replication show --location`, but the CLI requires `--name` for `show`, `delete`, and `update`. The test was corrected to use `az acr replication update --name eastus --region-endpoint-enabled false/true` and `az acr replication show --name eastus`.
- The Azure Monitor alert filtered `SuccessfulPullCount` by `Geolocation`, but that metric has no dimensions. The alert was changed to an overall low successful pull activity alert without the invalid dimension filter.
- The dedicated data endpoint explanation overstated throughput benefits. It was corrected to focus on registry-specific, region-specific endpoints for tightly scoped firewall rules, matching Microsoft documentation.
- The artifact streaming command used unsupported `--registry`, `--repository`, and `--filter` flags for `az acr artifact-streaming create`. It was corrected to use `--name` and `--image`, and a separate `az acr artifact-streaming update --repository --enable-streaming true` example was added for automatic streaming artifact creation.
- The multi-region AKS loop created clusters in per-region resource groups without creating those resource groups first. An `az group create` step was added inside the loop.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI reference pages rather than local `az --help` output. Artifact streaming and some CLI flags remain preview features, so readers should confirm current preview limitations before using them in production automation.
