# How to Use AKS Start/Stop Feature to Save Costs on Non-Production Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Kubernetes, AKS, Cost Optimization

Description: Reduce Azure costs by automatically starting and stopping AKS clusters on a schedule using the built-in start/stop feature for development and testing environments.

---

Running Kubernetes clusters 24/7 for development and testing wastes money. Azure Kubernetes Service provides a start/stop feature that deallocates cluster nodes when not in use, reducing compute costs by up to 70 percent for non-production workloads.

This guide shows you how to configure AKS start/stop scheduling to optimize costs while maintaining cluster configurations and state.

## Understanding AKS Start/Stop

When you stop an AKS cluster, Azure:

**Deallocates all agent nodes**, stopping compute charges.

**Preserves the control plane** at no cost for 90 days.

**Maintains cluster configuration**, including deployments, services, and persistent volumes.

**Keeps persistent disks**, which continue to incur storage costs.

Starting the cluster recreates nodes with the same configuration. Most workloads resume automatically.

## Manual Start/Stop Operations

Stop a cluster manually:

```bash
az aks stop \
  --name myAKSCluster \
  --resource-group myResourceGroup
```

This takes 5-10 minutes to complete. Check status:

```bash
az aks show \
  --name myAKSCluster \
  --resource-group myResourceGroup \
  --query powerState.code
```

Start the cluster:

```bash
az aks start \
  --name myAKSCluster \
  --resource-group myResourceGroup
```

Verify cluster is running:

```bash
kubectl get nodes
```

## Automating with Azure Automation

Create an automation account to schedule start/stop:

```bash
# Create automation account
az automation account create \
  --name aks-automation \
  --resource-group myResourceGroup \
  --location eastus

# Create managed identity for automation
az automation account update \
  --name aks-automation \
  --resource-group myResourceGroup \
  --assign-identity
```

Grant permissions:

```bash
# Get automation identity
IDENTITY_ID=$(az automation account show \
  --name aks-automation \
  --resource-group myResourceGroup \
  --query identity.principalId -o tsv)

# Grant contributor role
az role assignment create \
  --assignee $IDENTITY_ID \
  --role Contributor \
  --scope /subscriptions/SUBSCRIPTION_ID/resourceGroups/myResourceGroup
```

Create PowerShell runbook for stopping:

```powershell
# stop-aks-cluster.ps1
param(
    [string]$ResourceGroupName,
    [string]$ClusterName
)

# Connect using managed identity
Connect-AzAccount -Identity

# Stop the cluster
Stop-AzAksCluster -ResourceGroupName $ResourceGroupName -Name $ClusterName

Write-Output "Cluster $ClusterName stopped successfully"
```

Create runbook for starting:

```powershell
# start-aks-cluster.ps1
param(
    [string]$ResourceGroupName,
    [string]$ClusterName
)

Connect-AzAccount -Identity

Start-AzAksCluster -ResourceGroupName $ResourceGroupName -Name $ClusterName

Write-Output "Cluster $ClusterName started successfully"
```

Import runbooks:

```bash
az automation runbook create \
  --automation-account-name aks-automation \
  --resource-group myResourceGroup \
  --name stop-aks-cluster \
  --type PowerShell \
  --location eastus

az automation runbook publish \
  --automation-account-name aks-automation \
  --resource-group myResourceGroup \
  --name stop-aks-cluster
```

## Scheduling with Azure Automation

Create schedule to stop cluster at 7 PM:

```bash
az automation schedule create \
  --automation-account-name aks-automation \
  --resource-group myResourceGroup \
  --name stop-at-7pm \
  --start-time "2026-02-10T19:00:00-05:00" \
  --expiry-time "2027-12-31T19:00:00-05:00" \
  --interval 1 \
  --frequency Day \
  --time-zone "America/New_York"
```

Create schedule to start at 8 AM:

```bash
az automation schedule create \
  --automation-account-name aks-automation \
  --resource-group myResourceGroup \
  --name start-at-8am \
  --start-time "2026-02-10T08:00:00-05:00" \
  --expiry-time "2027-12-31T08:00:00-05:00" \
  --interval 1 \
  --frequency Day \
  --time-zone "America/New_York"
```

Link schedules to runbooks:

```bash
az automation job-schedule create \
  --automation-account-name aks-automation \
  --resource-group myResourceGroup \
  --runbook-name stop-aks-cluster \
  --schedule-name stop-at-7pm \
  --parameters ResourceGroupName=myResourceGroup ClusterName=myAKSCluster

az automation job-schedule create \
  --automation-account-name aks-automation \
  --resource-group myResourceGroup \
  --runbook-name start-aks-cluster \
  --schedule-name start-at-8am \
  --parameters ResourceGroupName=myResourceGroup ClusterName=myAKSCluster
```

## Using Terraform

Define start/stop automation with Terraform:

```hcl
# aks-automation.tf
resource "azurerm_automation_account" "aks" {
  name                = "aks-automation"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku_name           = "Basic"

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_role_assignment" "automation_contributor" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_automation_account.aks.identity[0].principal_id
}

resource "azurerm_automation_runbook" "stop_cluster" {
  name                    = "stop-aks-cluster"
  location                = azurerm_resource_group.main.location
  resource_group_name     = azurerm_resource_group.main.name
  automation_account_name = azurerm_automation_account.aks.name
  log_verbose             = true
  log_progress            = true
  runbook_type           = "PowerShell"

  content = file("${path.module}/scripts/stop-aks-cluster.ps1")
}

resource "azurerm_automation_schedule" "stop_evening" {
  name                    = "stop-at-7pm"
  resource_group_name     = azurerm_resource_group.main.name
  automation_account_name = azurerm_automation_account.aks.name
  frequency               = "Day"
  interval                = 1
  start_time              = "2026-02-10T19:00:00-05:00"
  timezone                = "America/New_York"
}
```

## Weekend-Only Schedules

Stop clusters on Friday evening, start Monday morning:

```bash
# Stop Friday at 6 PM
az automation schedule create \
  --automation-account-name aks-automation \
  --resource-group myResourceGroup \
  --name stop-friday \
  --start-time "2026-02-14T18:00:00-05:00" \
  --frequency Week \
  --interval 1 \
  --week-days Friday

# Start Monday at 7 AM
az automation schedule create \
  --automation-account-name aks-automation \
  --resource-group myResourceGroup \
  --name start-monday \
  --start-time "2026-02-10T07:00:00-05:00" \
  --frequency Week \
  --interval 1 \
  --week-days Monday
```

## Using Logic Apps

Alternative scheduling with Logic Apps:

```json
{
  "definition": {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "triggers": {
      "Recurrence": {
        "type": "Recurrence",
        "recurrence": {
          "frequency": "Day",
          "interval": 1,
          "schedule": {
            "hours": ["19"],
            "minutes": [0]
          },
          "timeZone": "Eastern Standard Time"
        }
      }
    },
    "actions": {
      "Stop_AKS_Cluster": {
        "type": "Http",
        "inputs": {
          "method": "POST",
          "uri": "https://management.azure.com/subscriptions/SUBSCRIPTION_ID/resourceGroups/myResourceGroup/providers/Microsoft.ContainerService/managedClusters/myAKSCluster/stop?api-version=2023-01-01",
          "authentication": {
            "type": "ManagedServiceIdentity"
          }
        }
      }
    }
  }
}
```

## Monitoring Start/Stop Operations

View automation job history:

```bash
az automation job list \
  --automation-account-name aks-automation \
  --resource-group myResourceGroup \
  --query "[].{Name:runbookName,Status:status,StartTime:startTime}"
```

Check specific job output:

```bash
JOB_ID=$(az automation job list \
  --automation-account-name aks-automation \
  --resource-group myResourceGroup \
  --query "[0].id" -o tsv)

az automation job show \
  --automation-account-name aks-automation \
  --resource-group myResourceGroup \
  --job-id $JOB_ID
```

## Cost Analysis

Calculate savings:

```bash
# Get cluster node configuration
az aks show \
  --name myAKSCluster \
  --resource-group myResourceGroup \
  --query "agentPoolProfiles[].{Name:name,Count:count,VMSize:vmSize}"
```

For a 3-node cluster with Standard_D4s_v3 VMs at $0.192/hour:
- Running 24/7: $0.192 × 3 × 24 × 30 = $414/month
- Running 12 hours/day: $0.192 × 3 × 12 × 30 = $207/month
- Savings: ~$207/month (50%)

## Handling Persistent Workloads

Before stopping, ensure stateful workloads are backed up:

```bash
# Create snapshot before stop
kubectl exec deployment/database -- pg_dump > backup.sql

# Stop cluster
az aks stop --name myAKSCluster --resource-group myResourceGroup

# After restart, restore if needed
kubectl exec deployment/database -- psql < backup.sql
```

## Troubleshooting

If cluster fails to start:

```bash
# Check cluster status
az aks show \
  --name myAKSCluster \
  --resource-group myResourceGroup \
  --query "powerState"

# View activity log
az monitor activity-log list \
  --resource-group myResourceGroup \
  --offset 1h
```

If pods don't restart:

```bash
# Check node status
kubectl get nodes

# Restart deployments if needed
kubectl rollout restart deployment --all
```

## Conclusion

AKS start/stop functionality significantly reduces costs for non-production environments by deallocating nodes during non-business hours. With Azure Automation or Logic Apps, you can schedule clusters to start and stop automatically, achieving 50-70 percent cost savings without manual intervention.

The feature works best for development, testing, and staging environments where 24/7 availability is not required. Production clusters should remain running for reliability, but non-production workloads benefit greatly from scheduled shutdown.
