# Set Up Geo-Replicated Azure Container Registry for Multi-Region AKS Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ACR, Geo-Replication, Azure, AKS, Container Registry, Multi-Region, DevOps

Description: How to configure Azure Container Registry with geo-replication for faster image pulls and improved reliability across multi-region AKS deployments.

---

Running AKS clusters in multiple Azure regions improves availability and brings applications closer to users. But if all those clusters pull container images from a single registry in one region, you get slow image pulls, increased cross-region bandwidth costs, and a single point of failure. Azure Container Registry geo-replication solves this by automatically replicating your images to registries in multiple regions, so each AKS cluster pulls from a local replica.

## Why Geo-Replication Matters

Without geo-replication, an AKS cluster in Southeast Asia pulling a 500 MB image from a registry in East US has to transfer that data across the Pacific. This adds seconds to every pod startup and minutes to large-scale deployments. With geo-replication, the same cluster usually pulls from a nearby replica, which reduces latency and startup time.

The benefits go beyond speed:

- **Faster pod startup**: Local pulls reduce the time between scheduling and running.
- **Resilience**: If one region has an outage, clusters in other regions still pull images.
- **Cost savings**: Intra-region data transfer is free. Cross-region transfers are not.
- **Simplified management**: Push once to one registry URL, pull from anywhere.

```mermaid
graph TD
    A[Developer] -->|Push Image| B[ACR East US - Primary]
    B -->|Auto-replicate| C[ACR West Europe - Replica]
    B -->|Auto-replicate| D[ACR Southeast Asia - Replica]
    E[AKS East US] -->|Local Pull| B
    F[AKS West Europe] -->|Local Pull| C
    G[AKS Southeast Asia] -->|Local Pull| D
```

## Prerequisites

- Azure Container Registry on the **Premium** SKU (geo-replication requires Premium)
- AKS clusters in multiple Azure regions
- Azure CLI 2.40+
- Contributor permissions to manage the ACR and AKS resources, plus Owner or Role Based Access Control Administrator permissions on the registry when using `--attach-acr` to create the pull role assignment

## Step 1: Create or Upgrade to Premium ACR

Geo-replication is only available on the Premium SKU. If you have an existing Basic or Standard ACR, upgrade it.

```bash
# Create a new Premium ACR

az acr create \
  --resource-group myResourceGroup \
  --name myregistry \
  --sku Premium \
  --location eastus

# Or upgrade an existing ACR to Premium
az acr update \
  --name myregistry \
  --sku Premium
```

## Step 2: Add Geo-Replications

Add replicas in the regions where your AKS clusters run.

```bash
# Add a replica in West Europe
az acr replication create \
  --registry myregistry \
  --location westeurope

# Add a replica in Southeast Asia
az acr replication create \
  --registry myregistry \
  --location southeastasia

# Add a replica in West US
az acr replication create \
  --registry myregistry \
  --location westus2
```

Each replication creates an active geo-replica of the registry. You can push and pull through any geo-replica, and when you push a new image, it is replicated to all regions automatically.

## Step 3: Verify Replications

Check the status of all replicas.

```bash
# List all replications and their provisioning state
az acr replication list \
  --registry myregistry \
  --output table
```

The output shows each region and its status. All replications should show `Succeeded` in the provisioning state.

## Step 4: Connect AKS Clusters to the ACR

Attach each AKS cluster to the same ACR. The geo-replicated registry uses a single DNS name (`myregistry.azurecr.io`), and Azure automatically routes pulls to the geo-replica with the best network performance profile, which is usually the nearest healthy replica.

```bash
# Attach ACR to the East US AKS cluster
az aks update \
  --resource-group myRG-eastus \
  --name myAKS-eastus \
  --attach-acr myregistry

# Attach ACR to the West Europe AKS cluster
az aks update \
  --resource-group myRG-westeurope \
  --name myAKS-westeurope \
  --attach-acr myregistry

# Attach ACR to the Southeast Asia AKS cluster
az aks update \
  --resource-group myRG-southeastasia \
  --name myAKS-southeastasia \
  --attach-acr myregistry
```

All clusters use the same registry URL (`myregistry.azurecr.io`). No region-specific URLs are needed.

## Step 5: Push Images and Verify Replication

Push an image and verify it is available in the registry. Replication to geo-replicas happens asynchronously.

```bash
# Log in to the registry
az acr login --name myregistry

# Tag and push an image
docker tag my-app:latest myregistry.azurecr.io/my-app:1.0.0
docker push myregistry.azurecr.io/my-app:1.0.0

# Check the image exists in the registry
az acr manifest list-metadata \
  --registry myregistry \
  --name my-app \
  --output table
```

Replication happens asynchronously, and replication time depends on image size and current service conditions. Use regional webhooks when you need a positive signal that a pushed image has reached a specific geo-replica.

## Step 6: Monitor Replication Status

Check the health and provisioning details for a specific geo-replica.

```bash
# Show status for a specific geo-replica
az acr replication show \
  --registry myregistry \
  --name westeurope \
  --query "{name:name, location:location, provisioningState:provisioningState, status:status.displayStatus}" \
  --output json
```

For production environments, set up alerts on replication health.

```bash
# Create a diagnostic setting to send ACR metrics to Log Analytics
az monitor diagnostic-settings create \
  --name acr-diagnostics \
  --resource "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.ContainerRegistry/registries/myregistry" \
  --workspace "<log-analytics-workspace-id>" \
  --metrics '[{"category": "AllMetrics", "enabled": true}]' \
  --logs '[{"category": "ContainerRegistryRepositoryEvents", "enabled": true}, {"category": "ContainerRegistryLoginEvents", "enabled": true}]'
```

## Step 7: Deploy to Multiple Regions

With geo-replication set up, deploying the same image to clusters in different regions uses the same image reference. Each cluster usually pulls from the nearest healthy replica.

```yaml
# deployment.yaml
# This exact same manifest works in every region
# Azure routes the pull to the nearest ACR replica automatically
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app
        # Same image reference regardless of region
        image: myregistry.azurecr.io/my-app:1.0.0
        ports:
        - containerPort: 8080
```

## Step 8: Set Up Webhook Notifications

Configure webhooks to trigger CI/CD pipelines or notifications when images are pushed or replicated.

```bash
# Create a webhook that fires when new images are pushed
az acr webhook create \
  --registry myregistry \
  --name notify-pipeline \
  --uri "https://my-ci-server.example.com/webhook/acr" \
  --actions push \
  --scope "my-app:*"
```

You can create region-specific webhooks to trigger deployments in specific clusters when images are replicated to their region. For a geo-replicated registry, add `--location <region>` when creating the webhook, and narrow `--scope` to the repository or tag you want to track.

## Cost Considerations

Geo-replication adds cost in two areas:

- **Per-replica cost**: Geo-replication is supported on the Premium SKU and is charged per replicated region according to the current Azure Container Registry pricing page.
- **Storage duplication**: Images are stored in each region. If you have 100 GB of images replicated across 3 regions, you are storing 300 GB total.
- **Replication bandwidth**: Data transfer between regions for replication is charged at standard Azure egress rates.

To manage costs:

- Only replicate to regions where you have AKS clusters.
- Set up image retention policies to clean up old tags.
- Use image deduplication (shared layers across images reduce storage).

```bash
# Set up a retention policy to automatically delete untagged manifests
az acr config retention update \
  --registry myregistry \
  --status enabled \
  --days 30 \
  --type UntaggedManifests
```

## Handling Replication Lag

There is a brief window between pushing an image and it being available in all regions. For most use cases, this delay is negligible (under a minute). But if you are deploying immediately after pushing, consider these strategies:

- **Wait for replication**: Add a delay in your CI/CD pipeline between push and deploy.
- **Use regional webhooks**: Trigger deployments in remote regions after the webhook for that replica fires.
- **Deploy to the push region first**: Deploy to the region where the image was pushed, then deploy to other regions after a brief delay.

```bash
#!/bin/bash
# Script to wait for a regional webhook event
# wait-for-replication.sh
# Waits until a region-specific webhook scoped to the image tag has received an event

REGISTRY="myregistry"
WEBHOOK_NAME="notify-pipeline-westeurope"
MAX_RETRIES=30
RETRY_INTERVAL=10

for i in $(seq 1 $MAX_RETRIES); do
    EVENT_COUNT=$(az acr webhook list-events \
        --registry "$REGISTRY" \
        --name "$WEBHOOK_NAME" \
        --query "length(@)" \
        --output tsv)

    if [ "$EVENT_COUNT" -gt 0 ]; then
        echo "Regional webhook received a push event"
        exit 0
    fi

    echo "Waiting for regional webhook event... attempt $i/$MAX_RETRIES"
    sleep $RETRY_INTERVAL
done

echo "Timed out waiting for regional webhook event"
exit 1
```

## Private Endpoints with Geo-Replication

In enterprise environments, you may need private endpoints for each VNet that pulls from the registry. Create a private endpoint in each VNet that needs private access.

```bash
# Create a private endpoint for the ACR replica in West Europe
az network private-endpoint create \
  --resource-group myRG-westeurope \
  --name acr-pe-westeurope \
  --vnet-name myVNet-westeurope \
  --subnet private-endpoints \
  --private-connection-resource-id "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.ContainerRegistry/registries/myregistry" \
  --group-id registry \
  --connection-name acr-connection-westeurope
```

Each VNet that uses private access needs a private endpoint and private DNS zone link. For geo-replicated registries, private endpoints use dedicated regional data endpoints, so make sure your private DNS records include each replica's data endpoint and that the private endpoint subnet has enough IP capacity for the additional regional endpoints.

## Summary

Geo-replicated ACR is the foundation of reliable multi-region AKS deployments. Push once, pull locally from any region. The setup is straightforward - upgrade to Premium SKU, add replications in your target regions, and attach the same registry to all your AKS clusters. Azure handles the routing automatically. The combination of faster pulls, regional resilience, and simplified image management makes geo-replication worth the additional cost for any multi-region deployment strategy.
