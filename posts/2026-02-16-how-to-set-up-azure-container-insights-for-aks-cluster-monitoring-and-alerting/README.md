# How to Set Up Azure Container Insights for AKS Cluster Monitoring and Alerting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Azure Monitor, Container Insights, Kubernetes, Monitoring, Alerting, Observability

Description: Learn how to enable Azure Container Insights on AKS for real-time monitoring, log collection, and configuring alerts for cluster health.

---

Running an AKS cluster without proper monitoring is like driving at night with no headlights. You will not know something is wrong until users start complaining. Azure Container Insights provides out-of-the-box monitoring for AKS clusters, collecting metrics from nodes, pods, and containers without requiring you to deploy and manage a separate monitoring stack. This guide walks through setting it up and configuring alerts that actually matter.

## What Container Insights Collects

Container Insights installs an agent on each node in your cluster that collects:

- **Node metrics**: CPU, memory, disk usage, and network throughput per node
- **Pod and container metrics**: CPU and memory usage, restart counts, and ready/not-ready states
- **Kubernetes events**: Pod scheduling, scaling events, and errors
- **Container logs**: stdout and stderr from all containers
- **Kubernetes inventory**: Deployments, ReplicaSets, DaemonSets, and their states

All this data flows into a Log Analytics workspace where you can query it with Kusto Query Language (KQL) and build dashboards and alerts.

## Prerequisites

You need:

- An AKS cluster (any supported Kubernetes version)
- A Log Analytics workspace (Container Insights will create one if you do not specify)
- Azure CLI 2.40 or later
- Owner or Contributor role on the AKS cluster and the Log Analytics workspace

## Step 1: Enable Container Insights

The simplest approach is enabling the monitoring add-on directly on the AKS cluster.

```bash
# Enable Container Insights with a new Log Analytics workspace
# Azure creates the workspace in the same region as the cluster
az aks enable-addons \
  --addon monitoring \
  --resource-group myResourceGroup \
  --name myAKSCluster
```

If you already have a Log Analytics workspace you want to use, specify it.

```bash
# Get the workspace resource ID
export WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group myMonitoringRG \
  --workspace-name myLogAnalyticsWorkspace \
  --query id \
  --output tsv)

# Enable Container Insights with an existing workspace
az aks enable-addons \
  --addon monitoring \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --workspace-resource-id "$WORKSPACE_ID"
```

## Step 2: Verify the Agent Is Running

After enabling the add-on, the monitoring agent deploys as a DaemonSet.

```bash
# Check that the OMS agent pods are running on every node
kubectl get pods -n kube-system -l component=oms-agent

# You should see one pod per node in Running state
kubectl get daemonset omsagent -n kube-system
```

If using the newer Azure Monitor agent (AMA), check for those pods instead.

```bash
# For clusters using the Azure Monitor agent
kubectl get pods -n kube-system -l rsName=ama-logs-ds
```

## Step 3: Configure Data Collection Rules

By default, Container Insights collects everything, which can get expensive for large clusters. Data Collection Rules (DCR) let you control what gets collected and how often.

```bash
# Create a data collection rule that filters out verbose logs
# and reduces collection frequency for non-critical metrics
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --enable-managed-identity \
  --data-collection-settings datacollection.json
```

Create a `datacollection.json` file with your collection preferences.

```json
{
  "interval": "1m",
  "namespaceFilteringMode": "Include",
  "namespaces": ["default", "production", "staging"],
  "enableContainerLogV2": true,
  "streams": [
    "Microsoft-ContainerLog",
    "Microsoft-ContainerLogV2",
    "Microsoft-KubeEvents",
    "Microsoft-KubePodInventory",
    "Microsoft-KubeNodeInventory",
    "Microsoft-Perf"
  ]
}
```

This configuration collects data every minute, only from the specified namespaces, and includes container logs, events, inventory, and performance metrics. Excluding namespaces like kube-system from log collection can significantly reduce your Log Analytics costs.

## Step 4: Explore the Built-in Dashboards

Container Insights comes with pre-built views in the Azure portal. Navigate to your AKS cluster in the portal and click on "Insights" under the Monitoring section. You will see dashboards for:

- **Cluster health**: Overall node and pod status
- **Nodes**: CPU and memory utilization per node
- **Controllers**: Deployment and DaemonSet health
- **Containers**: Individual container resource usage
- **Deployments**: Rollout status and pod counts

These dashboards update in near real-time and provide a good starting point before you build custom views.

## Step 5: Write Custom KQL Queries

The real power of Container Insights is in the Log Analytics workspace. Here are some queries that surface actionable information.

Find pods with high restart counts in the last 24 hours.

```
// Pods that restarted more than 3 times in the last 24 hours
// High restart counts often indicate crash loops or OOM kills
KubePodInventory
| where TimeGenerated > ago(24h)
| where PodRestartCount > 3
| project TimeGenerated, Namespace, Name, PodRestartCount, PodStatus
| order by PodRestartCount desc
```

Find nodes approaching memory pressure.

```
// Nodes using more than 80% of their allocatable memory
// Helps catch memory pressure before pods get evicted
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "K8SNode" and CounterName == "memoryAllocatableBytes"
| join kind=inner (
    Perf
    | where ObjectName == "K8SNode" and CounterName == "memoryRssBytes"
) on Computer, TimeGenerated
| extend MemoryUtilization = CounterValue1 / CounterValue * 100
| where MemoryUtilization > 80
| project TimeGenerated, Computer, MemoryUtilization
| order by MemoryUtilization desc
```

Identify containers that were OOM killed.

```
// Find containers terminated due to OOM (Out of Memory)
// These need memory limit adjustments
ContainerInventory
| where TimeGenerated > ago(7d)
| where ContainerState == "Terminated"
| where ExitCode == 137
| project TimeGenerated, ContainerName, Namespace = ContainerHostname, ExitCode
| order by TimeGenerated desc
```

## Step 6: Set Up Metric Alerts

Alerts notify you when something goes wrong before users notice. Start with these essential alerts.

### High Node CPU Alert

```bash
# Create an alert rule for high node CPU utilization
# Fires when any node exceeds 90% CPU for 10 minutes
az monitor metrics alert create \
  --resource-group myResourceGroup \
  --name "High Node CPU" \
  --scopes "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.ContainerService/managedClusters/myAKSCluster" \
  --condition "avg node_cpu_usage_percentage > 90" \
  --window-size 10m \
  --evaluation-frequency 5m \
  --severity 2 \
  --action "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/microsoft.insights/actionGroups/myActionGroup"
```

### Pod Failure Alert

```bash
# Create an alert for pods in a failed state
# Catches CrashLoopBackOff, ImagePullBackOff, and other failures
az monitor metrics alert create \
  --resource-group myResourceGroup \
  --name "Failed Pods" \
  --scopes "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.ContainerService/managedClusters/myAKSCluster" \
  --condition "count kube_pod_status_phase{phase=Failed} > 0" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 1 \
  --action "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/microsoft.insights/actionGroups/myActionGroup"
```

### Log-Based Alert for OOM Kills

For more complex conditions, use log-based alerts.

```bash
# Create a log alert that fires when OOM kills are detected
az monitor scheduled-query create \
  --resource-group myResourceGroup \
  --name "OOM Kill Alert" \
  --scopes "$WORKSPACE_ID" \
  --condition "count > 0" \
  --condition-query "ContainerInventory | where ContainerState == 'Terminated' and ExitCode == 137 | where TimeGenerated > ago(15m)" \
  --evaluation-frequency 5m \
  --window-size 15m \
  --severity 2 \
  --action "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/microsoft.insights/actionGroups/myActionGroup"
```

## Step 7: Set Up an Action Group

Action groups define who gets notified and how. Create one that sends emails and optionally triggers webhooks or Azure Functions.

```bash
# Create an action group that emails the platform team
az monitor action-group create \
  --resource-group myResourceGroup \
  --name myActionGroup \
  --short-name PlatTeam \
  --email-receiver name=PlatformLead email=platform-lead@example.com \
  --email-receiver name=OnCall email=oncall@example.com
```

## Cost Management Tips

Container Insights data ingestion can get expensive for large clusters. Here are ways to control costs:

- **Filter namespaces**: Only collect data from namespaces you care about
- **Reduce collection frequency**: Increase the interval from the default 1 minute to 5 minutes for non-critical environments
- **Exclude verbose containers**: Some containers (like sidecars) produce enormous log volumes with little diagnostic value
- **Set data retention policies**: Configure the Log Analytics workspace to retain data for 30 days instead of the default 90
- **Use Basic Logs tier**: For log data you only need occasionally, the Basic Logs tier costs significantly less

## Summary

Azure Container Insights gives you visibility into your AKS cluster without the overhead of managing Prometheus, Grafana, and log aggregation infrastructure yourself. Enable the add-on, tune data collection to avoid cost surprises, build a few KQL queries for common troubleshooting scenarios, and set up alerts for the conditions that warrant human attention. The built-in dashboards handle day-to-day monitoring, while KQL queries and alerts catch the edge cases that dashboards miss.
