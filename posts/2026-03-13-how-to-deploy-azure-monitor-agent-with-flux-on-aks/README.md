# How to Deploy Azure Monitor Agent with Flux on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Azure, AKS, Azure Monitor, Observability, Logging, Metrics, Container Insights

Description: Learn how to deploy and configure the Azure Monitor Agent on AKS using Flux CD for GitOps-managed observability and monitoring.

---

## Introduction

Azure Monitor provides comprehensive observability for AKS clusters through Container Insights, which collects metrics, logs, and performance data from your Kubernetes workloads. The Azure Monitor Agent (AMA) is the data collection agent that sends this telemetry to your Log Analytics workspace.

Deploying and configuring the monitoring stack through Flux ensures that your observability setup is consistent, version-controlled, and automatically applied across all clusters. This guide covers deploying the Azure Monitor Agent, configuring data collection rules, and setting up custom metric collection using Flux.

## Prerequisites

- An Azure subscription
- An AKS cluster running Kubernetes 1.24 or later
- Flux CLI version 2.0 or later bootstrapped on the cluster
- A Log Analytics workspace

## Step 1: Create a Log Analytics Workspace

If you do not already have a workspace:

```bash
az monitor log-analytics workspace create \
  --resource-group my-resource-group \
  --workspace-name my-flux-workspace \
  --location eastus

export WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group my-resource-group \
  --workspace-name my-flux-workspace \
  --query id -o tsv)
```

## Step 2: Enable Container Insights via AKS Add-on

The simplest way to enable monitoring is through the AKS add-on:

```bash
az aks enable-addons \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --addons monitoring \
  --workspace-resource-id "$WORKSPACE_ID"
```

This installs the Azure Monitor Agent and configures default data collection. For more granular control managed through Flux, continue with the steps below.

## Step 3: Configure Data Collection Rules

Data Collection Rules (DCR) control what data the agent collects. Create a DCR through Azure CLI:

```bash
az monitor data-collection rule create \
  --resource-group my-resource-group \
  --name my-aks-dcr \
  --location eastus \
  --data-flows '[{
    "streams": ["Microsoft-ContainerInsights-Group-Default"],
    "destinations": ["la-workspace"]
  }]' \
  --destinations '{
    "logAnalytics": [{
      "workspaceResourceId": "'"$WORKSPACE_ID"'",
      "name": "la-workspace"
    }]
  }'
```

## Step 4: Deploy Custom ConfigMap for Agent Configuration

Use Flux to manage the Azure Monitor Agent configuration through a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ama-metrics-settings-configmap
  namespace: kube-system
data:
  schema-version: v1
  config-version: ver1
  prometheus-collector-settings: |
    cluster_alias = "my-flux-cluster"
  default-scrape-settings-enabled: |
    kubelet = true
    coredns = true
    cadvisor = true
    kubeproxy = true
    apiserver = true
    kubestate = true
    nodeexporter = true
```

## Step 5: Configure Log Collection Settings

Create a ConfigMap to control log collection behavior:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: container-azm-ms-agentconfig
  namespace: kube-system
data:
  schema-version: v1
  config-version: ver1
  log-data-collection-settings: |
    [log_collection_settings]
      [log_collection_settings.stdout]
        enabled = true
        exclude_namespaces = ["kube-system", "gatekeeper-system"]
      [log_collection_settings.stderr]
        enabled = true
        exclude_namespaces = []
      [log_collection_settings.env_var]
        enabled = true
      [log_collection_settings.enrich_container_logs]
        enabled = true
      [log_collection_settings.collect_all_kube_events]
        enabled = true
  prometheus-data-collection-settings: |
    [prometheus_data_collection_settings.cluster]
      interval = "1m"
      fieldpass = ["job_name", "namespace", "pod", "container"]
      monitor_kubernetes_pods = true
      monitor_kubernetes_pods_namespaces = ["default", "production"]
    [prometheus_data_collection_settings.node]
      interval = "1m"
```

## Step 6: Deploy Prometheus Scrape Configuration

Configure custom Prometheus scrape targets through Flux:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ama-metrics-prometheus-config
  namespace: kube-system
data:
  prometheus-config: |
    global:
      scrape_interval: 30s
    scrape_configs:
      - job_name: 'my-app-metrics'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
            action: replace
            target_label: __metrics_path__
            regex: (.+)
          - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
            action: replace
            regex: ([^:]+)(?::\d+)?;(\d+)
            replacement: $1:$2
            target_label: __address__
```

## Step 7: Create a Flux Kustomization

Organize all monitoring resources under a Flux Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/monitoring
  prune: true
```

## Step 8: Set Up Alerts Through Flux

Define alert rules as Kubernetes resources managed by Flux:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: container-azm-ms-alerts
  namespace: kube-system
data:
  schema-version: v1
  alertable-metrics-configuration-settings: |
    [alertable_metrics_configuration_settings.container_resource_utilization_thresholds]
      container_cpu_threshold_percentage = 80.0
      container_memory_rss_threshold_percentage = 80.0
      container_memory_working_set_threshold_percentage = 80.0
    [alertable_metrics_configuration_settings.pv_utilization_thresholds]
      pv_usage_threshold_percentage = 80.0
```

## Verifying the Setup

Check that the monitoring agent is running and collecting data:

```bash
kubectl get pods -n kube-system -l component=ama-logs
kubectl get pods -n kube-system -l rsName=ama-metrics
kubectl logs -n kube-system -l component=ama-logs --tail=20
```

Verify data is flowing to the Log Analytics workspace:

```bash
az monitor log-analytics query \
  --workspace "$WORKSPACE_ID" \
  --analytics-query "ContainerLog | take 10" \
  --output table
```

## Troubleshooting

**No data in Log Analytics**: Allow 10 to 15 minutes for initial data ingestion. Check agent logs for authentication or connectivity errors.

**Missing namespaces in logs**: Review the `exclude_namespaces` setting in the agent ConfigMap. Ensure your target namespaces are not excluded.

**High ingestion costs**: Use the log collection settings to exclude verbose namespaces and reduce the collection interval. Consider filtering specific log levels at the source.

**Prometheus metrics not appearing**: Verify that your pods have the correct annotations (`prometheus.io/scrape: "true"`) and that the scrape configuration matches your pods' port and path settings.

## Conclusion

Deploying Azure Monitor Agent through Flux gives you GitOps-managed observability on AKS. Data collection rules, log settings, Prometheus scrape configurations, and alert thresholds are all version-controlled and automatically reconciled. This approach makes it easy to maintain consistent monitoring across multiple clusters and roll out configuration changes through pull requests.
