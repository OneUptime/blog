# How to Configure AKS Maintenance Windows for Planned Node OS and Kubernetes Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Maintenance Windows, Kubernetes Upgrades, Node OS, Azure, Cluster Management, Operations

Description: How to configure AKS maintenance windows to control when node OS patches and Kubernetes version upgrades happen to minimize disruption.

---

AKS clusters need regular updates - node OS security patches, Kubernetes version upgrades, and runtime updates. By default, these can happen at any time, which means your production workloads might get disrupted during peak business hours. Maintenance windows let you control exactly when these updates occur, aligning cluster maintenance with your organization's change management processes.

## Types of AKS Maintenance

AKS has three distinct types of maintenance, each controllable with separate maintenance windows:

1. **Node OS security patches (nodeOSUpgrade)**: Linux kernel updates, security patches, and package updates applied to the underlying node OS. These are frequent and usually require a node reboot.

2. **AKS-managed updates (aksManagedAutoUpgradeSchedule)**: Kubernetes version upgrades, node image upgrades, and runtime updates managed by AKS auto-upgrade channels.

3. **Weekly node image updates (default)**: The default maintenance configuration that applies when no specific window is configured.

## Prerequisites

- An AKS cluster running Kubernetes 1.24+
- Azure CLI 2.40+ with the aks-preview extension
- Owner or Contributor role on the AKS cluster

```bash
# Install or update the aks-preview extension
az extension add --name aks-preview
az extension update --name aks-preview
```

## Step 1: View Current Maintenance Configuration

Check what maintenance configuration exists on your cluster.

```bash
# List all maintenance configurations on the cluster
az aks maintenanceconfiguration list \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --output table
```

If the output is empty, no maintenance windows are configured and updates can happen at any time.

## Step 2: Configure a Maintenance Window for Node OS Updates

Node OS patches are the most frequent type of update. Set a weekly window for when these can be applied.

```bash
# Create a maintenance window for node OS upgrades
# This allows updates only on Sundays between 1 AM and 5 AM UTC
az aks maintenanceconfiguration add \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name aksManagedNodeOSUpgradeSchedule \
  --schedule-type Weekly \
  --day-of-week Sunday \
  --start-time 01:00 \
  --duration 4 \
  --utc-offset +00:00
```

The parameters break down as:

- **name**: Must be `aksManagedNodeOSUpgradeSchedule` for node OS updates.
- **schedule-type**: `Weekly` or `AbsoluteMonthly` or `RelativeMonthly`.
- **day-of-week**: Which day the window opens.
- **start-time**: When the window opens (24-hour format).
- **duration**: How many hours the window stays open (minimum 4 hours).
- **utc-offset**: Timezone offset from UTC.

## Step 3: Configure a Maintenance Window for Kubernetes Upgrades

Kubernetes version upgrades are less frequent but more impactful. Set a monthly window.

```bash
# Create a maintenance window for AKS auto-upgrades
# This allows Kubernetes upgrades on the first Sunday of each month, 2 AM - 8 AM UTC
az aks maintenanceconfiguration add \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name aksManagedAutoUpgradeSchedule \
  --schedule-type RelativeMonthly \
  --day-of-week Sunday \
  --week-index First \
  --start-time 02:00 \
  --duration 6 \
  --utc-offset +00:00
```

The `RelativeMonthly` schedule type with `--week-index First` means the first Sunday of every month.

## Step 4: Configure the Default Maintenance Window

The default maintenance window applies to operations not covered by the specific windows above.

```bash
# Create a default maintenance window
# This covers general maintenance tasks
az aks maintenanceconfiguration add \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name default \
  --schedule-type Weekly \
  --day-of-week Saturday \
  --start-time 00:00 \
  --duration 8 \
  --utc-offset +00:00
```

## Step 5: Add Date Exclusions

Block maintenance during critical business periods like Black Friday, end-of-quarter processing, or planned events.

```bash
# Add date exclusions to the node OS upgrade window
# Block maintenance during holiday season
az aks maintenanceconfiguration update \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name aksManagedNodeOSUpgradeSchedule \
  --schedule-type Weekly \
  --day-of-week Sunday \
  --start-time 01:00 \
  --duration 4 \
  --utc-offset +00:00 \
  --start-date "2026-11-25T00:00:00Z" \
  --end-date "2026-12-02T00:00:00Z"
```

## Step 6: Configure Auto-Upgrade Channel

Maintenance windows control when upgrades happen, but the auto-upgrade channel controls what gets upgraded. Set the appropriate channel.

```bash
# Set the auto-upgrade channel
# Options: none, patch, stable, rapid, node-image
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --auto-upgrade-channel stable
```

Channel descriptions:

- **none**: No automatic upgrades. You must upgrade manually.
- **patch**: Automatically upgrades to the latest patch version within the current minor version (e.g., 1.28.1 to 1.28.5).
- **stable**: Upgrades to the latest patch of the N-1 minor version (where N is the latest supported version).
- **rapid**: Upgrades to the latest supported patch of the latest supported minor version.
- **node-image**: Only upgrades the node image, not the Kubernetes version.

For production, `patch` or `stable` are the safest choices. They keep you current with security fixes without jumping to bleeding-edge Kubernetes versions.

## Step 7: Configure Node OS Upgrade Channel

Separately from Kubernetes upgrades, you can control how node OS updates are applied.

```bash
# Set the node OS upgrade channel
# Options: None, Unmanaged, NodeImage, SecurityPatch
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --node-os-upgrade-channel SecurityPatch
```

Channel descriptions:

- **None**: No automatic node OS updates.
- **Unmanaged**: OS updates follow the node image, applied through node image upgrades.
- **NodeImage**: Nodes are updated to the latest node image on each maintenance window.
- **SecurityPatch**: Only security patches are applied, without a full node image update. This is faster and less disruptive.

`SecurityPatch` is recommended for production because it applies critical fixes quickly without the overhead of a full node image replacement.

## Step 8: Monitor Maintenance Events

Track when maintenance actually occurs and what changes were applied.

```bash
# View the activity log for AKS upgrade operations
az monitor activity-log list \
  --resource-group myResourceGroup \
  --resource-id "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.ContainerService/managedClusters/myAKSCluster" \
  --query "[?contains(operationName.value, 'Upgrade')]" \
  --output table

# Check the current node image versions
az aks nodepool list \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --query "[].{name:name, nodeImageVersion:nodeImageVersion, kubernetesVersion:currentOrchestratorVersion}" \
  --output table
```

## Step 9: Set Up Alerts for Maintenance Events

Create alerts so your team knows when maintenance is happening.

```bash
# Create an alert for AKS upgrade events
az monitor activity-log alert create \
  --resource-group myResourceGroup \
  --name "AKS Maintenance Alert" \
  --scope "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.ContainerService/managedClusters/myAKSCluster" \
  --condition category=Administrative \
  --condition operationName="Microsoft.ContainerService/managedClusters/write" \
  --action-group myActionGroup
```

## Practical Window Planning

Here is a strategy that works for most production environments:

| Maintenance Type | Schedule | Duration | Rationale |
|---|---|---|---|
| Node OS Security | Every Sunday 1-5 AM | 4 hours | Weekly patches, minimal impact |
| Kubernetes Upgrade | First Sunday monthly 2-8 AM | 6 hours | Monthly cadence, longer for rolling updates |
| Default | Saturday midnight-8 AM | 8 hours | Catch-all for other operations |

Adjust the times based on your traffic patterns. If your peak traffic is on weekends, shift maintenance to Tuesday or Wednesday nights instead.

## Pod Disruption Budgets

Maintenance windows control when updates start, but Pod Disruption Budgets (PDBs) control how many pods can be disrupted during the update process.

```yaml
# pdb.yaml
# Ensure at least 2 pods are always available during node updates
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: web-app
```

PDBs work alongside maintenance windows. The maintenance window determines when the node drain starts, and the PDB determines how many pods can be evicted simultaneously during the drain.

## Troubleshooting

**Maintenance happening outside the window**: Certain critical security patches may bypass maintenance windows. Azure reserves the right to apply emergency patches outside configured windows for critical vulnerabilities.

**Upgrade stuck or taking too long**: If the maintenance window is too short for all nodes to be updated, the process continues in the next window. Increase the duration if this happens frequently.

**Pods not being rescheduled**: If PDBs are too restrictive (e.g., minAvailable equals the replica count), nodes cannot drain and the upgrade stalls. Make sure PDBs allow at least one pod to be disrupted.

## Summary

Maintenance windows give you control over when AKS applies updates to your cluster. Configure separate windows for node OS security patches and Kubernetes version upgrades, set appropriate auto-upgrade channels, and use date exclusions to protect critical business periods. Combined with Pod Disruption Budgets, you get a maintenance strategy that keeps your cluster secure and up to date while minimizing disruption to your production workloads.
