# How to Select Azure Regions for ACI Deployments in Portainer - Select

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Azure, ACI, Region, Cloud Infrastructure

Description: Learn how to choose the appropriate Azure region for Azure Container Instances deployments in Portainer for performance and compliance.

## Why Region Selection Matters

Choosing the right Azure region for ACI deployments affects:

- **Latency**: Deploy close to your users or downstream services.
- **Compliance**: Data residency laws may require specific geographic regions.
- **Availability**: Not all ACI features, quotas, and regional capacity are available in every region.
- **Cost**: Pricing varies slightly by region.

## Regions Available for ACI

```bash
# List all regions where ACI is available

az provider show --namespace Microsoft.ContainerInstance \
  --query "resourceTypes[?resourceType=='containerGroups'].locations | [0]" \
  -o table
```

Common ACI-supported Azure CLI region names:
- `eastus`, `eastus2` - US East Coast
- `westus`, `westus2`, `westus3` - US West Coast
- `northeurope`, `westeurope` - Europe
- `eastasia`, `southeastasia` - Asia Pacific
- `australiaeast` - Australia

## Selecting a Region When Adding a Container in Portainer

After connecting an ACI environment:

1. Open the Azure ACI environment in Portainer.
2. From the menu select **Container instances**, then click **Add container**.
3. Select the subscription and resource group for the container.
4. In the **Location** field, select your target Azure datacenter/region.
5. Click **Deploy the container**.

The location selection determines where that container group is deployed.

## Deploying to a Specific Region via CLI

```bash
# Specify region when creating a container
az container create \
  --resource-group my-resource-group \
  --name my-app \
  --image nginx:alpine \
  --location westeurope \
  --cpu 1 \
  --memory 1 \
  --ports 80

# List container groups per region
az container list \
  --resource-group my-resource-group \
  --query "[?location=='westeurope'].{name:name, status:instanceView.state}"
```

## Multi-Region ACI Strategy

For high availability or geographic distribution, deploy containers in multiple regions:

```bash
# Deploy to US East
az container create \
  --resource-group rg-east \
  --name my-app-east \
  --image my-app:latest \
  --location eastus \
  --cpu 1 --memory 1

# Deploy to West Europe
az container create \
  --resource-group rg-europe \
  --name my-app-europe \
  --image my-app:latest \
  --location westeurope \
  --cpu 1 --memory 1

# Use Azure Traffic Manager or Front Door to route between regions
```

## Checking Region-Specific ACI Capabilities

Not all container configurations are available in every region:

```bash
# Check availability zone support metadata for ACI container groups
az provider show --namespace Microsoft.ContainerInstance \
  --query "resourceTypes[?resourceType=='containerGroups'].zoneMappings | [0]" \
  -o json
```

GPU-enabled ACI container groups were retired on July 14, 2025. Check Microsoft's ACI resource availability and quota limits before selecting preview or specialized features such as Spot containers, confidential containers, or zonal deployments.

## Region Selection Checklist

Before selecting a region:
- [ ] Is the region within your required data residency boundary?
- [ ] Is the region close enough to your users or services for acceptable latency?
- [ ] Does the region support the container size (CPU/memory) you need?
- [ ] Does the region have a paired region for disaster recovery?

## Conclusion

Region selection for ACI in Portainer is straightforward - choose the location when deploying the container. For production workloads with compliance requirements, always verify data residency rules before deploying to a region.
