# How to Set Up Azure Monitor for Containers to Monitor AKS Cluster Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Monitor, AKS, Kubernetes, Container Monitoring, Container Insights, Observability

Description: A complete guide to setting up Azure Monitor for Containers (Container Insights) to monitor AKS cluster health including nodes, pods, and workloads.

---

Running Kubernetes in production without proper monitoring is like driving at night with no headlights. You might be fine for a while, but when something goes wrong, you will not see it coming. Azure Monitor for Containers (also known as Container Insights) gives you deep visibility into your AKS clusters, covering everything from node health and pod resource consumption to container logs and live metrics.

In this post, I will walk through setting up Container Insights from scratch, show you what data it collects, how to interpret the key views, and how to set up alerts for the most important cluster health indicators.

## What Container Insights Monitors

Container Insights collects data at multiple levels of the Kubernetes stack:

**Node level** - CPU usage, memory usage, disk pressure, network I/O, node conditions
**Pod level** - CPU and memory requests vs. limits vs. actual usage, restart counts, pod conditions
**Container level** - Per-container resource usage, log output (stdout/stderr)
**Workload level** - Deployment replica counts, DaemonSet coverage, StatefulSet status
**Cluster level** - Overall resource utilization, scheduling capacity, kube-system health

The data is collected by a containerized agent (the Azure Monitor agent or the legacy OMS agent) that runs as a DaemonSet on every node. The agent sends data to a Log Analytics workspace where it can be queried with KQL and visualized in the Azure Portal.

## Prerequisites

Before enabling Container Insights, you need:

1. An AKS cluster (any tier)
2. A Log Analytics workspace (an existing one or a new one will be created)
3. The Azure CLI with the aks-preview extension (optional, for advanced features)
4. Sufficient permissions - Contributor on the AKS cluster and Log Analytics workspace

## Method 1: Enable During AKS Cluster Creation

The simplest approach is to enable monitoring when you create the cluster:

```bash
# Create an AKS cluster with Container Insights enabled
az aks create \
    --resource-group "aks-rg" \
    --name "my-aks-cluster" \
    --node-count 3 \
    --node-vm-size "Standard_DS2_v2" \
    --enable-addons monitoring \
    --workspace-resource-id "/subscriptions/sub-id/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/my-workspace" \
    --generate-ssh-keys
```

The `--enable-addons monitoring` flag installs the monitoring agent and configures it to send data to the specified Log Analytics workspace.

## Method 2: Enable on an Existing Cluster

If your cluster already exists, you can enable monitoring after the fact:

```bash
# Enable Container Insights on an existing AKS cluster
az aks enable-addons \
    --addon monitoring \
    --name "my-aks-cluster" \
    --resource-group "aks-rg" \
    --workspace-resource-id "/subscriptions/sub-id/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/my-workspace"
```

### Verify the Agent Installation

After enabling, verify that the monitoring agents are running:

```bash
# Check that the omsagent pods are running
kubectl get pods -n kube-system | grep ama-

# You should see pods like:
# ama-logs-xxxxx           Running
# ama-logs-rs-xxxxx        Running
```

The `ama-logs` DaemonSet runs on every node and collects container logs and performance data. The `ama-logs-rs` ReplicaSet collects cluster-level data.

## Method 3: Enable with Azure Monitor Agent (Recommended)

The newer approach uses the Azure Monitor Agent (AMA) with Data Collection Rules (DCR), which gives you more control over what data is collected:

```bash
# Enable monitoring with Azure Monitor Agent
az aks enable-addons \
    --addon monitoring \
    --name "my-aks-cluster" \
    --resource-group "aks-rg" \
    --workspace-resource-id "/subscriptions/sub-id/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/my-workspace" \
    --enable-msi-auth-for-monitoring
```

## Configuring Data Collection

By default, Container Insights collects a lot of data, which can get expensive for large clusters. You can customize what is collected using a ConfigMap.

### Creating a Data Collection ConfigMap

```yaml
# container-azm-ms-agentconfig.yaml
# This ConfigMap controls what the monitoring agent collects
kind: ConfigMap
apiVersion: v1
data:
  schema-version: v1
  config-version: v1
  log-data-collection-settings: |-
    [log_collection_settings]
      # Collect stdout logs from containers
      [log_collection_settings.stdout]
        enabled = true
        # Exclude logs from kube-system to reduce volume
        exclude_namespaces = ["kube-system","gatekeeper-system"]

      # Collect stderr logs from containers
      [log_collection_settings.stderr]
        enabled = true
        exclude_namespaces = ["kube-system"]

      # Environment variable collection
      [log_collection_settings.env_var]
        enabled = true

      # Collect enrich container logs with Kubernetes metadata
      [log_collection_settings.enrich_container_logs]
        enabled = true

  prometheus-data-collection-settings: |-
    [prometheus_data_collection_settings.cluster]
      # Scrape Prometheus metrics from annotated pods
      monitor_kubernetes_pods = true
      monitor_kubernetes_pods_namespaces = ["default","app-namespace"]

    [prometheus_data_collection_settings.node]
      # Scrape node-level metrics
      urls = ["http://$NODE_IP:9100/metrics"]
      interval = "1m"

  metric_collection_settings: |-
    [metric_collection_settings.collect_kube_system_pv_metrics]
      enabled = true
metadata:
  name: container-azm-ms-agentconfig
  namespace: kube-system
```

Apply the ConfigMap:

```bash
kubectl apply -f container-azm-ms-agentconfig.yaml
```

The monitoring agent picks up the configuration changes within a few minutes.

## Exploring Container Insights in the Portal

Once data starts flowing, navigate to your AKS cluster in the Azure Portal and click on "Insights" under Monitoring. You will see several views:

### Cluster View

The cluster view shows overall resource utilization:
- Node count and status
- Pod count vs. capacity
- CPU and memory utilization across all nodes
- Controller (deployment/replicaset) health

### Nodes View

Drill into individual nodes to see:
- Per-node CPU and memory usage
- Pod distribution across nodes
- Node conditions (disk pressure, memory pressure, PID pressure)
- Pod eviction history

### Controllers View

See the health of your deployments, DaemonSets, and StatefulSets:
- Desired vs. current replica count
- Pod restart counts
- Container resource usage per controller

### Containers View

The most detailed view, showing individual containers:
- CPU and memory usage vs. requests vs. limits
- Container restart count and last restart time
- Container log output

## Key KQL Queries for AKS Monitoring

The data collected by Container Insights is stored in several tables in your Log Analytics workspace.

### Node Resource Utilization

```kusto
// CPU utilization per node over time
KubeNodeInventory
| where TimeGenerated > ago(1h)
| distinct ClusterName, Computer
| join kind=inner (
    Perf
    | where TimeGenerated > ago(1h)
    | where ObjectName == "K8SNode"
    | where CounterName == "cpuUsageNanoCores"
    | summarize AvgCPU = avg(CounterValue) by Computer, bin(TimeGenerated, 5m)
) on Computer
| project TimeGenerated, Computer, AvgCPU
| render timechart
```

### Pod Restart Alerts

```kusto
// Pods that have restarted in the last hour
KubePodInventory
| where TimeGenerated > ago(1h)
| where PodRestartCount > 0
| summarize
    MaxRestarts = max(PodRestartCount),
    arg_max(TimeGenerated, *)
    by Name, Namespace
| where MaxRestarts > 3
| project Name, Namespace, MaxRestarts, PodStatus, ContainerStatus
| sort by MaxRestarts desc
```

### Container Memory Pressure

```kusto
// Containers approaching memory limits
let memoryLimits = KubePodInventory
| where TimeGenerated > ago(15m)
| distinct ContainerName, ContainerID
| join kind=inner (
    ContainerInventory
    | where TimeGenerated > ago(15m)
    | project ContainerID, MemoryLimit = EnvironmentVar
) on ContainerID;
Perf
| where TimeGenerated > ago(15m)
| where ObjectName == "K8SContainer"
| where CounterName == "memoryRssBytes"
| summarize AvgMemory = avg(CounterValue) by InstanceName, bin(TimeGenerated, 5m)
| render timechart
```

### Failed Pod Scheduling

```kusto
// Events indicating scheduling failures
KubeEvents
| where TimeGenerated > ago(1h)
| where Reason == "FailedScheduling"
| project TimeGenerated, Name, Namespace, Message
| sort by TimeGenerated desc
```

### Container Log Analysis

```kusto
// Search container logs for errors
ContainerLogV2
| where TimeGenerated > ago(1h)
| where LogMessage contains "error" or LogMessage contains "exception"
| project TimeGenerated, PodName, ContainerName, LogMessage
| sort by TimeGenerated desc
| take 50
```

## Setting Up Alerts

Alerts are essential for proactive monitoring. Here are the recommended alerts for AKS:

### Node Not Ready Alert

```bash
# Alert when a node is in NotReady state
az monitor scheduled-query create \
    --name "AKS-Node-NotReady" \
    --resource-group "monitoring-rg" \
    --scopes "/subscriptions/sub-id/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/my-workspace" \
    --condition "count > 0" \
    --condition-query "KubeNodeInventory | where Status == 'NotReady' | where TimeGenerated > ago(5m) | distinct Computer" \
    --evaluation-frequency "5m" \
    --window-size "5m" \
    --severity 1 \
    --action-groups "/subscriptions/sub-id/resourceGroups/monitoring-rg/providers/microsoft.insights/actionGroups/aks-alerts"
```

### Pod Restart Alert

```bash
# Alert when pods restart frequently
az monitor scheduled-query create \
    --name "AKS-Pod-Restarts" \
    --resource-group "monitoring-rg" \
    --scopes "/subscriptions/sub-id/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/my-workspace" \
    --condition "count > 0" \
    --condition-query "KubePodInventory | where TimeGenerated > ago(10m) | where PodRestartCount > 5 | distinct Name, Namespace" \
    --evaluation-frequency "5m" \
    --window-size "10m" \
    --severity 2 \
    --action-groups "/subscriptions/sub-id/resourceGroups/monitoring-rg/providers/microsoft.insights/actionGroups/aks-alerts"
```

### High CPU Alert (Metric-Based)

```bash
# Alert on high cluster CPU utilization
az monitor metrics alert create \
    --name "AKS-High-CPU" \
    --resource-group "aks-rg" \
    --scopes "/subscriptions/sub-id/resourceGroups/aks-rg/providers/Microsoft.ContainerService/managedClusters/my-aks-cluster" \
    --condition "avg node cpu utilization percentage > 85" \
    --window-size 10m \
    --evaluation-frequency 5m \
    --severity 2 \
    --action "/subscriptions/sub-id/resourceGroups/monitoring-rg/providers/microsoft.insights/actionGroups/aks-alerts"
```

## Cost Optimization

Container Insights can generate a significant amount of log data, especially for large clusters. Here are strategies to control costs:

**Exclude verbose namespaces.** Use the ConfigMap to exclude kube-system and other noisy namespaces from stdout collection.

**Use Basic logs tier.** For container logs that you only need for troubleshooting (not alerting), configure the ContainerLogV2 table to use the Basic logs tier at lower cost.

**Reduce collection frequency.** Increase the collection interval for performance counters from 1 minute to 5 minutes if near-real-time data is not critical.

**Set retention policies.** Configure your Log Analytics workspace to retain data only as long as needed. Thirty days is often sufficient for operational data.

```bash
# Set table-level retention
az monitor log-analytics workspace table update \
    --resource-group "monitoring-rg" \
    --workspace-name "my-workspace" \
    --name "ContainerLogV2" \
    --retention-in-days 30
```

## Recommended Workbook

Azure provides a built-in Container Insights Workbook that is excellent out of the box. Navigate to your AKS cluster, click Workbooks, and look for the "Container Insights" templates. These include:

- Cluster utilization and capacity
- Node and pod performance
- Container log analysis
- Network and disk I/O
- Billing usage estimation

## Summary

Azure Monitor for Containers gives you comprehensive visibility into your AKS clusters with minimal setup. Enable it during cluster creation or add it to existing clusters, customize the data collection to balance visibility with cost, set up alerts for critical health indicators, and use the built-in portal views and KQL queries for day-to-day monitoring and troubleshooting. The combination of metric-based alerting, log-based querying, and the rich portal experience makes Container Insights the standard monitoring solution for AKS workloads.
