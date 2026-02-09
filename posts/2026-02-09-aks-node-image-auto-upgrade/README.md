# How to Upgrade AKS Clusters with Node Image Upgrades and Auto-Upgrade Channels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, AKS, Kubernetes

Description: Learn how to upgrade Azure Kubernetes Service clusters using node image upgrades and auto-upgrade channels for automated, secure cluster maintenance with minimal manual intervention.

---

Azure Kubernetes Service offers sophisticated upgrade mechanisms through node image upgrades and auto-upgrade channels. These features automate security patching, Kubernetes version upgrades, and node OS updates, reducing operational burden while maintaining cluster security and stability.

## Understanding AKS Node Image Upgrades

Node image upgrades replace the underlying OS image of your worker nodes without changing the Kubernetes version. Microsoft regularly releases updated node images containing security patches, bug fixes, and OS-level improvements. Keeping node images current is essential for security compliance.

Unlike Kubernetes version upgrades that change the control plane and kubelet versions, node image upgrades only update the base OS image. This makes them lower risk and can be performed more frequently without worrying about API compatibility issues.

## Checking Current Node Image Versions

Before upgrading, check what node images your clusters are currently running.

```bash
#!/bin/bash
# check-aks-node-images.sh

RESOURCE_GROUP="production-rg"
CLUSTER_NAME="production-aks"

echo "Checking AKS node image versions..."

# Get cluster details
az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --query "{version:kubernetesVersion,nodeResourceGroup:nodeResourceGroup}"

# Get node pool details
az aks nodepool list \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --query "[].{name:name,version:orchestratorVersion,nodeImageVersion:nodeImageVersion}" \
  --output table

# Check available node image updates
az aks nodepool get-upgrades \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --nodepool-name nodepool1 \
  --output table
```

View detailed node information from within the cluster:

```bash
# Check node OS image from inside cluster
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
OS-IMAGE:.status.nodeInfo.osImage,\
KERNEL:.status.nodeInfo.kernelVersion,\
CONTAINER-RUNTIME:.status.nodeInfo.containerRuntimeVersion

# Get node creation times to identify old nodes
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
AGE:.metadata.creationTimestamp
```

## Performing Manual Node Image Upgrades

Manually trigger node image upgrades when you want control over timing.

```bash
#!/bin/bash
# upgrade-aks-node-images.sh

RESOURCE_GROUP="production-rg"
CLUSTER_NAME="production-aks"

echo "Starting AKS node image upgrade..."

# List all node pools
node_pools=$(az aks nodepool list \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --query "[].name" \
  --output tsv)

for pool in $node_pools; do
  echo "Upgrading node pool: $pool"

  # Check if upgrade available
  available=$(az aks nodepool get-upgrades \
    --resource-group $RESOURCE_GROUP \
    --cluster-name $CLUSTER_NAME \
    --nodepool-name $pool \
    --query "latestNodeImageVersion" \
    --output tsv)

  if [ "$available" != "null" ]; then
    echo "  Latest image available: $available"

    # Upgrade node pool image
    az aks nodepool upgrade \
      --resource-group $RESOURCE_GROUP \
      --cluster-name $CLUSTER_NAME \
      --name $pool \
      --node-image-only \
      --no-wait

    echo "  Node image upgrade initiated"
  else
    echo "  Already on latest image"
  fi
done

# Monitor upgrade progress
echo "Monitoring upgrade progress..."
while true; do
  status=$(az aks nodepool list \
    --resource-group $RESOURCE_GROUP \
    --cluster-name $CLUSTER_NAME \
    --query "[?provisioningState!='Succeeded'].{name:name,state:provisioningState}" \
    --output table)

  if [ -z "$status" ] || [ "$status" == "[]" ]; then
    echo "All node pools upgraded successfully"
    break
  fi

  echo "$(date): Upgrade in progress..."
  echo "$status"
  sleep 60
done
```

## Configuring Auto-Upgrade Channels

Auto-upgrade channels automate Kubernetes version and node image upgrades based on your chosen upgrade pace.

```bash
#!/bin/bash
# configure-auto-upgrade.sh

RESOURCE_GROUP="production-rg"
CLUSTER_NAME="production-aks"

# Available channels: rapid, stable, patch, node-image, none
UPGRADE_CHANNEL="stable"

echo "Configuring auto-upgrade channel: $UPGRADE_CHANNEL"

az aks update \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --auto-upgrade-channel $UPGRADE_CHANNEL

# Verify configuration
az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --query "autoUpgradeProfile"
```

Configure auto-upgrade with Terraform:

```hcl
resource "azurerm_kubernetes_cluster" "main" {
  name                = "production-aks"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "production"
  kubernetes_version  = "1.29.0"

  # Configure auto-upgrade channel
  automatic_channel_upgrade = "stable"

  # Configure maintenance window
  maintenance_window {
    allowed {
      day   = "Saturday"
      hours = [2, 3, 4, 5]
    }
    allowed {
      day   = "Sunday"
      hours = [2, 3, 4, 5]
    }
  }

  # Node image upgrade configuration
  maintenance_window_auto_upgrade {
    frequency    = "Weekly"
    interval     = 1
    duration     = 4
    day_of_week  = "Saturday"
    start_time   = "02:00"
    utc_offset   = "+00:00"
  }

  maintenance_window_node_os {
    frequency    = "Weekly"
    interval     = 1
    duration     = 4
    day_of_week  = "Sunday"
    start_time   = "02:00"
    utc_offset   = "+00:00"
  }

  default_node_pool {
    name                = "default"
    node_count          = 3
    vm_size             = "Standard_DS2_v2"
    enable_auto_scaling = true
    min_count           = 3
    max_count           = 10

    upgrade_settings {
      max_surge = "33%"
    }
  }

  identity {
    type = "SystemAssigned"
  }
}
```

## Understanding Auto-Upgrade Channels

AKS offers several auto-upgrade channels with different upgrade paces:

**node-image**: Only upgrades node images automatically, not Kubernetes versions. This is the most conservative option.

**patch**: Automatically upgrades to the latest supported patch version. For example, if running 1.28.3 and 1.28.5 is released, automatically upgrades to 1.28.5.

**stable**: Automatically upgrades to the latest supported minor version N-1, where N is the latest supported minor version. This provides a balance between stability and staying current.

**rapid**: Automatically upgrades to the latest supported minor version as soon as it's available. Use this for development clusters only.

```bash
# Compare upgrade channels
cat > compare-channels.sh << 'EOF'
#!/bin/bash

echo "Auto-Upgrade Channel Comparison"
echo "================================"
echo "none: No automatic upgrades"
echo "node-image: OS image updates only"
echo "patch: Kubernetes patch version updates (1.28.3 -> 1.28.5)"
echo "stable: Minor version N-1 (if latest is 1.29, upgrades to 1.28)"
echo "rapid: Latest minor version immediately (1.29 as soon as available)"
echo ""
echo "Recommendation:"
echo "- Production: stable or patch"
echo "- Staging: stable or rapid"
echo "- Development: rapid"
EOF

chmod +x compare-channels.sh
./compare-channels.sh
```

## Setting Up Planned Maintenance Windows

Control when auto-upgrades occur by configuring planned maintenance windows.

```bash
#!/bin/bash
# configure-maintenance-windows.sh

RESOURCE_GROUP="production-rg"
CLUSTER_NAME="production-aks"

# Create maintenance configuration for auto-upgrades
az aks maintenanceconfiguration add \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --name default \
  --weekday Saturday \
  --start-hour 2 \
  --duration 4

# Add additional maintenance window
az aks maintenanceconfiguration add \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --name default \
  --weekday Sunday \
  --start-hour 2 \
  --duration 4

# Create maintenance configuration for node OS updates
az aks maintenanceconfiguration add \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --name aksManagedNodeOSUpgradeSchedule \
  --weekday Sunday \
  --start-hour 3 \
  --duration 4

# View maintenance windows
az aks maintenanceconfiguration list \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --output table

# Add maintenance window exclusion for critical periods
az aks maintenanceconfiguration add \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --name default \
  --not-allowed-start "2024-12-24T00:00:00Z" \
  --not-allowed-end "2024-12-26T23:59:59Z"
```

## Monitoring Auto-Upgrades

Set up monitoring to track when auto-upgrades occur and their results.

```bash
#!/bin/bash
# monitor-auto-upgrades.sh

RESOURCE_GROUP="production-rg"
CLUSTER_NAME="production-aks"

echo "Monitoring AKS auto-upgrades..."

# Check upgrade history
az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --query "autoUpgradeProfile"

# View recent operations
az aks operation-status list \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --output table

# Check node pool provisioning state
watch -n 30 "az aks nodepool list \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --query \"[].{name:name,state:provisioningState,version:orchestratorVersion,image:nodeImageVersion}\" \
  --output table"

# Monitor node status
watch -n 30 "kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
STATUS:.status.conditions[?(@.type==\"Ready\")].status,\
VERSION:.status.nodeInfo.kubeletVersion,\
IMAGE:.status.nodeInfo.osImage"
```

Create Azure Monitor alerts for upgrade events:

```bash
#!/bin/bash
# create-upgrade-alerts.sh

RESOURCE_GROUP="production-rg"
CLUSTER_NAME="production-aks"
ACTION_GROUP="aks-alerts"

# Create action group for notifications
az monitor action-group create \
  --resource-group $RESOURCE_GROUP \
  --name $ACTION_GROUP \
  --short-name aksalert \
  --email-receiver name=admin email=admin@example.com

# Create alert for upgrade start
CLUSTER_ID=$(az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --query id \
  --output tsv)

az monitor activity-log alert create \
  --resource-group $RESOURCE_GROUP \
  --name "aks-upgrade-started" \
  --description "Alert when AKS cluster upgrade starts" \
  --scope $CLUSTER_ID \
  --condition category=Administrative and operationName=Microsoft.ContainerService/managedClusters/write \
  --action-group $ACTION_GROUP

# Create alert for upgrade completion
az monitor activity-log alert create \
  --resource-group $RESOURCE_GROUP \
  --name "aks-upgrade-completed" \
  --description "Alert when AKS cluster upgrade completes" \
  --scope $CLUSTER_ID \
  --condition category=Administrative and operationName=Microsoft.ContainerService/managedClusters/write and status=Succeeded \
  --action-group $ACTION_GROUP
```

## Configuring Node Pool Upgrade Settings

Control how quickly nodes are upgraded within each node pool.

```bash
#!/bin/bash
# configure-node-pool-upgrades.sh

RESOURCE_GROUP="production-rg"
CLUSTER_NAME="production-aks"
NODE_POOL="nodepool1"

# Configure max surge for faster upgrades
az aks nodepool update \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --name $NODE_POOL \
  --max-surge 33%

# Alternative: configure specific number
az aks nodepool update \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --name $NODE_POOL \
  --max-surge 2

# View current settings
az aks nodepool show \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --name $NODE_POOL \
  --query "upgradeSettings"
```

## Testing Auto-Upgrade Configuration

Validate your auto-upgrade configuration works correctly.

```bash
#!/bin/bash
# test-auto-upgrade.sh

RESOURCE_GROUP="production-rg"
CLUSTER_NAME="production-aks"

echo "Testing auto-upgrade configuration..."

# Check auto-upgrade channel
channel=$(az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --query "autoUpgradeProfile.upgradeChannel" \
  --output tsv)

echo "Auto-upgrade channel: $channel"

# Check maintenance windows
echo "Maintenance windows:"
az aks maintenanceconfiguration list \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --output table

# Simulate upgrade by checking what would be upgraded
echo "Available upgrades:"
az aks get-upgrades \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --output table

# Check node pool upgrade readiness
for pool in $(az aks nodepool list \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --query "[].name" \
  --output tsv); do

  echo "Node pool: $pool"
  az aks nodepool get-upgrades \
    --resource-group $RESOURCE_GROUP \
    --cluster-name $CLUSTER_NAME \
    --nodepool-name $pool \
    --output table
done
```

## Handling Upgrade Failures

If an auto-upgrade or manual upgrade fails, troubleshoot and recover.

```bash
#!/bin/bash
# troubleshoot-upgrade-failure.sh

RESOURCE_GROUP="production-rg"
CLUSTER_NAME="production-aks"

echo "Troubleshooting AKS upgrade failure..."

# Check cluster provisioning state
az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --query "{provisioningState:provisioningState,powerState:powerState.code}"

# Check node pool states
az aks nodepool list \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --query "[].{name:name,state:provisioningState,message:provisioningStateMessage}" \
  --output table

# View activity logs for errors
az monitor activity-log list \
  --resource-group $RESOURCE_GROUP \
  --offset 2h \
  --query "[?contains(resourceId, '$CLUSTER_NAME')].{time:eventTimestamp,operation:operationName.localizedValue,status:status.localizedValue,message:properties.statusMessage}" \
  --output table

# Check for failed pods
kubectl get pods -A --field-selector status.phase!=Running,status.phase!=Succeeded

# Check node conditions
kubectl describe nodes | grep -A 10 "Conditions:"
```

## Post-Upgrade Validation

After auto-upgrades complete, validate cluster health.

```bash
#!/bin/bash
# validate-aks-upgrade.sh

RESOURCE_GROUP="production-rg"
CLUSTER_NAME="production-aks"

echo "Validating AKS cluster after upgrade..."

# Verify cluster version
az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --query "{version:kubernetesVersion,provisioningState:provisioningState}"

# Verify node versions
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
VERSION:.status.nodeInfo.kubeletVersion,\
IMAGE:.status.nodeInfo.osImage

# Check all pods running
echo "Pod health check:"
kubectl get pods -A --field-selector status.phase!=Running,status.phase!=Succeeded

# Run connectivity test
kubectl run test-dns --image=busybox --rm -it --restart=Never -- nslookup kubernetes.default

# Check addon health
echo "Addon status:"
kubectl get pods -n kube-system

echo "Validation complete"
```

AKS auto-upgrade channels and node image upgrades provide a robust, automated approach to cluster maintenance. By configuring appropriate upgrade channels, maintenance windows, and monitoring, you can keep your AKS clusters secure and up to date with minimal manual intervention while maintaining control over when upgrades occur.
