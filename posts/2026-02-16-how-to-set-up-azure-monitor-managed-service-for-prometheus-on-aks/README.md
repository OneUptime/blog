# How to Set Up Azure Monitor Managed Service for Prometheus on AKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Prometheus, Azure Monitor, Monitoring, Kubernetes, Metrics, Grafana

Description: Step-by-step guide to setting up Azure Monitor managed Prometheus on AKS for scalable metric collection without managing your own Prometheus infrastructure.

---

Running your own Prometheus server on AKS works fine until it does not. The moment your cluster grows past a handful of nodes, you start wrestling with storage, retention, high availability, and the inevitable out-of-memory kills when your metric cardinality explodes. Azure Monitor managed service for Prometheus takes all of that off your plate. Microsoft runs the Prometheus infrastructure, you just point it at your cluster and start querying.

This is not a black-box monitoring solution. It is actual Prometheus under the hood, with full PromQL support, remote-write compatibility, and native integration with Azure Managed Grafana. You keep the Prometheus ecosystem you already know, but without the operational burden of running it yourself.

## Prerequisites

Before starting, make sure you have the following in place.

- An AKS cluster running Kubernetes 1.25 or later
- Azure CLI version 2.49 or newer
- The `aks-preview` CLI extension (for some features)
- An Azure Monitor workspace (we will create one below)

```bash
# Install or update the aks-preview extension
az extension add --name aks-preview --upgrade

# Register the required resource providers
az provider register --namespace Microsoft.Monitor
az provider register --namespace Microsoft.Dashboard
```

## Creating the Azure Monitor Workspace

The Azure Monitor workspace is where your Prometheus metrics are stored. It is a managed data store optimized for time-series data, separate from your Log Analytics workspace.

```bash
# Create an Azure Monitor workspace
az monitor account create \
  --name my-prometheus-workspace \
  --resource-group monitoring-rg \
  --location eastus

# Get the workspace ID for later use
MONITOR_WORKSPACE_ID=$(az monitor account show \
  --name my-prometheus-workspace \
  --resource-group monitoring-rg \
  --query id -o tsv)

echo "Workspace ID: $MONITOR_WORKSPACE_ID"
```

## Enabling Prometheus Metrics Collection on AKS

With the workspace created, enable the Prometheus metrics add-on on your AKS cluster. This deploys a metrics collection agent (based on the OpenTelemetry Collector) on each node in your cluster.

```bash
# Enable Prometheus metrics collection on the AKS cluster
az aks update \
  --resource-group myRG \
  --name myAKS \
  --enable-azure-monitor-metrics \
  --azure-monitor-workspace-resource-id "$MONITOR_WORKSPACE_ID"
```

This command does several things behind the scenes. It deploys a DaemonSet called `ama-metrics` in the `kube-system` namespace that runs on every node. It configures the agent to scrape the default Kubernetes metrics endpoints. And it sets up remote-write to push those metrics into your Azure Monitor workspace.

You can verify the deployment is healthy.

```bash
# Check that the metrics agent pods are running
kubectl get pods -n kube-system -l rsName=ama-metrics

# Check the DaemonSet status
kubectl get daemonset ama-metrics -n kube-system

# Verify the replica set agent is running (handles cluster-level metrics)
kubectl get pods -n kube-system -l rsName=ama-metrics-ksm
```

## What Gets Scraped by Default

Out of the box, the managed Prometheus agent scrapes a standard set of targets.

- **kubelet metrics**: Node-level container metrics like CPU, memory, and network.
- **cAdvisor**: Container-level resource usage.
- **kube-state-metrics**: Kubernetes object states (deployments, pods, nodes).
- **Node exporter**: Hardware and OS metrics from each node.

This covers the fundamentals, but you will likely want to scrape your own application metrics as well.

## Configuring Custom Scrape Targets

To scrape custom Prometheus endpoints from your applications, you need to create a ConfigMap that defines additional scrape jobs. The agent watches for a specific ConfigMap and merges it with the default configuration.

```yaml
# custom-scrape-config.yaml
# ConfigMap that adds custom Prometheus scrape targets
# The agent reads this and adds these jobs to its scrape configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: ama-metrics-prometheus-config
  namespace: kube-system
data:
  prometheus-config: |
    scrape_configs:
      # Scrape all pods that have prometheus.io annotations
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          # Only scrape pods with prometheus.io/scrape: "true" annotation
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
          # Use the prometheus.io/path annotation or default to /metrics
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
            action: replace
            target_label: __metrics_path__
            regex: (.+)
          # Use the prometheus.io/port annotation for the scrape port
          - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
            action: replace
            regex: ([^:]+)(?::\d+)?;(\d+)
            replacement: $1:$2
            target_label: __address__
          # Add pod labels as metric labels
          - action: labelmap
            regex: __meta_kubernetes_pod_label_(.+)
          # Add namespace and pod name labels
          - source_labels: [__meta_kubernetes_namespace]
            action: replace
            target_label: namespace
          - source_labels: [__meta_kubernetes_pod_name]
            action: replace
            target_label: pod

      # Scrape a specific service endpoint
      - job_name: 'my-api-metrics'
        static_configs:
          - targets: ['my-api-service.default.svc.cluster.local:9090']
        metrics_path: /metrics
        scrape_interval: 30s
```

Apply the ConfigMap and the agent will pick it up within a couple of minutes.

```bash
# Apply the custom scrape configuration
kubectl apply -f custom-scrape-config.yaml

# The agent automatically reloads - check logs to verify
kubectl logs -n kube-system -l rsName=ama-metrics --tail=20
```

## Setting Up Azure Managed Grafana

Prometheus metrics are not very useful without a visualization layer. Azure Managed Grafana integrates directly with the Azure Monitor workspace and comes with pre-built dashboards for Kubernetes.

```bash
# Create an Azure Managed Grafana instance
az grafana create \
  --name my-grafana \
  --resource-group monitoring-rg \
  --location eastus

# Link the Grafana instance to the Azure Monitor workspace
GRAFANA_ID=$(az grafana show \
  --name my-grafana \
  --resource-group monitoring-rg \
  --query id -o tsv)

az aks update \
  --resource-group myRG \
  --name myAKS \
  --enable-azure-monitor-metrics \
  --azure-monitor-workspace-resource-id "$MONITOR_WORKSPACE_ID" \
  --grafana-resource-id "$GRAFANA_ID"
```

After linking, Azure automatically configures the Prometheus data source in Grafana and imports a set of Kubernetes dashboards. You can access Grafana through the Azure portal or directly at the Grafana endpoint URL.

```bash
# Get the Grafana endpoint URL
az grafana show \
  --name my-grafana \
  --resource-group monitoring-rg \
  --query "properties.endpoint" -o tsv
```

## Querying Metrics with PromQL

You can query your metrics directly in Grafana using standard PromQL. Here are some useful queries for AKS monitoring.

```promql
# CPU usage by namespace
sum(rate(container_cpu_usage_seconds_total{namespace!="kube-system"}[5m])) by (namespace)

# Memory usage per pod
container_memory_working_set_bytes{namespace="production"} / 1024 / 1024

# Pod restart count in the last hour
increase(kube_pod_container_status_restarts_total[1h]) > 0

# Request latency for your application (if exposing histogram metrics)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="my-api-metrics"}[5m]))

# Node CPU utilization percentage
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

## Configuring Recording Rules

For frequently used or expensive queries, set up recording rules to pre-compute the results. This is done through Azure Monitor rule groups.

```bash
# Create a Prometheus rule group for recording rules
az monitor account rule-group create \
  --name "aks-recording-rules" \
  --resource-group monitoring-rg \
  --location eastus \
  --azure-monitor-workspace-ids "$MONITOR_WORKSPACE_ID" \
  --rules '[
    {
      "record": "namespace:container_cpu_usage:sum_rate5m",
      "expression": "sum(rate(container_cpu_usage_seconds_total[5m])) by (namespace)",
      "labels": {"source": "recording-rule"}
    },
    {
      "record": "namespace:container_memory_usage:sum",
      "expression": "sum(container_memory_working_set_bytes) by (namespace)",
      "labels": {"source": "recording-rule"}
    }
  ]' \
  --interval "PT1M" \
  --scope-cluster-id "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.ContainerService/managedClusters/myAKS"
```

## Setting Up Alerting Rules

You can also create Prometheus-native alerting rules that trigger Azure Monitor alerts.

```bash
# Create an alert rule group
az monitor account rule-group create \
  --name "aks-alert-rules" \
  --resource-group monitoring-rg \
  --location eastus \
  --azure-monitor-workspace-ids "$MONITOR_WORKSPACE_ID" \
  --rules '[
    {
      "alert": "HighPodRestartRate",
      "expression": "increase(kube_pod_container_status_restarts_total[1h]) > 5",
      "for": "PT10M",
      "severity": 3,
      "labels": {"team": "platform"},
      "annotations": {
        "summary": "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} has restarted more than 5 times in the last hour"
      }
    }
  ]' \
  --interval "PT1M" \
  --scope-cluster-id "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.ContainerService/managedClusters/myAKS"
```

## Controlling Costs with Metric Filtering

Managed Prometheus charges based on the number of metrics ingested. To keep costs under control, filter out metrics you do not need.

```yaml
# metric-filtering.yaml
# ConfigMap to control which metrics are collected
apiVersion: v1
kind: ConfigMap
metadata:
  name: ama-metrics-settings-configmap
  namespace: kube-system
data:
  # Disable collection of specific default targets
  default-scrape-settings-enabled: |-
    kubelet = true
    coredns = true
    cadvisor = true
    kubeproxy = false
    apiserver = false
    kubestate = true
    nodeexporter = true
  # Keep only specific metrics from cadvisor to reduce cardinality
  default-targets-metrics-keep-list: |-
    cadvisor = container_cpu_usage_seconds_total|container_memory_working_set_bytes|container_network_receive_bytes_total|container_network_transmit_bytes_total
```

## Wrapping Up

Azure Monitor managed Prometheus gives you the Prometheus experience without the Prometheus operations overhead. The setup is straightforward - create a workspace, enable the add-on, and your metrics start flowing. Add custom scrape targets for your application metrics, connect Managed Grafana for dashboards, and set up recording and alerting rules for operational visibility. The biggest win is not having to worry about Prometheus storage, high availability, or scaling - Microsoft handles all of that. Your team gets to focus on what the metrics are telling you rather than keeping the metrics pipeline running.
