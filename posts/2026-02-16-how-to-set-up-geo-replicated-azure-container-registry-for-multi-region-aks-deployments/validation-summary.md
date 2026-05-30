# Validation Summary: Set Up Geo-Replicated Azure Container Registry for Multi-Region AKS Deployments

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure Container Registry
- ACR geo-replication
- Azure Kubernetes Service
- Azure CLI
- Docker image tagging and pushing
- Kubernetes Deployment manifests
- Azure Monitor diagnostic settings
- ACR webhooks
- ACR private endpoints

## Sources Consulted
- Microsoft Learn: Geo-replication in Azure Container Registry - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication
- Microsoft Learn: Azure CLI `az acr replication` reference - https://learn.microsoft.com/en-us/cli/azure/acr/replication?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az acr manifest` reference - https://learn.microsoft.com/en-us/cli/azure/acr/manifest?view=azure-cli-latest
- Microsoft Learn: Authenticate with Azure Container Registry from AKS - https://learn.microsoft.com/en-us/azure/aks/cluster-container-registry-integration
- Microsoft Learn: Azure CLI `az aks update` reference - https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest#az-aks-update
- Microsoft Learn: Azure Container Registry webhooks - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-webhook
- Microsoft Learn: Azure CLI `az acr webhook` reference - https://learn.microsoft.com/en-us/cli/azure/acr/webhook?view=azure-cli-latest
- Microsoft Learn: Connect privately to an Azure container registry using Azure Private Link - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-link
- Microsoft Learn: Set a retention policy for untagged manifests - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-retention-policy
- Microsoft Learn: Supported log categories for Microsoft.ContainerRegistry/registries - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-containerregistry-registries-logs
- Microsoft Azure pricing: Azure Container Registry pricing - https://azure.microsoft.com/en-us/pricing/details/container-registry/

## Issues Found
- The post described geo-replicas as read replicas. Updated this to active geo-replicas because ACR geo-replication supports push and pull operations through geo-replicas.
- The post stated that pulls route to the nearest replica and that latency is measured in milliseconds. Updated the wording to match Microsoft guidance: routing is based on the best network performance profile and is usually to a nearby healthy replica.
- The prerequisites said Contributor role was enough for all operations. Updated this to note that `--attach-acr` creates a role assignment and requires Owner or Role Based Access Control Administrator permissions on the registry.
- The image verification command was described as checking all regions. `az acr manifest list-metadata` verifies registry manifest metadata, not per-region image replication. Updated the text to clarify asynchronous replication and recommend regional webhooks when a per-replica signal is required.
- The replication status section claimed `az acr replication show` checks status for specific images or repositories. Updated it to describe geo-replica health and provisioning details instead.
- The deployment section stated that clusters pull from the nearest replica. Updated it to the more accurate "usually pulls from the nearest healthy replica" wording.
- The webhook section mentioned region-specific webhooks but omitted the required location guidance. Added `--location <region>` guidance and a note to narrow `--scope`.
- The cost section included a fixed approximate monthly price and ambiguous storage math. Replaced the fixed price with a reference to current Azure pricing and clarified the storage example as replication across three regions.
- The replication-lag script checked replica health, not image replication completion. Replaced it with a webhook-event polling example for a region-specific webhook scoped to the image tag.
- The private endpoint section implied a private endpoint is required per replica. Updated it to describe private endpoints per VNet, regional data endpoints, private DNS records, and subnet IP capacity for geo-replicated registries.

## Review Notes
Azure CLI is not installed in the local workspace, so command validation was performed against official Microsoft Learn CLI reference pages rather than local `az --help` output. The remaining examples use current Azure CLI command groups and documented ACR, AKS, Azure Monitor, webhook, retention policy, and private endpoint concepts.
