# How to Monitor Multiple Talos Clusters Centrally

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Monitoring, Prometheus, Grafana, Observability

Description: Learn how to set up centralized monitoring for multiple Talos Linux clusters using Prometheus, Thanos, Grafana, and other observability tools.

---

When you run one Talos Linux cluster, monitoring is straightforward. Install Prometheus and Grafana, set up some dashboards, and you are done. When you run five or twenty clusters, you need a way to see everything in one place. Jumping between Grafana instances for each cluster wastes time and makes it easy to miss problems.

This guide covers setting up centralized monitoring for a fleet of Talos Linux clusters.

## Architecture Overview

The standard architecture for multi-cluster monitoring uses a hub-and-spoke model. Each cluster (spoke) runs its own Prometheus instance that scrapes local metrics. A central aggregation layer (hub) pulls metrics from all clusters and provides a unified query interface.

There are two main approaches:

1. **Thanos**: Extends Prometheus with long-term storage and global querying
2. **Victoria Metrics**: A Prometheus-compatible time series database designed for scale

Both work well with Talos Linux. This guide focuses on Thanos since it builds directly on Prometheus, but the concepts apply to Victoria Metrics too.

## Setting Up Prometheus on Each Cluster

First, deploy the kube-prometheus-stack on each Talos cluster. This gives you Prometheus, Alertmanager, and a set of default dashboards:

```bash
# Install kube-prometheus-stack on each cluster
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.externalLabels.cluster="cluster-a" \
  --set prometheus.prometheusSpec.externalLabels.region="us-east" \
  --set prometheus.prometheusSpec.retention=24h \
  --set prometheus.prometheusSpec.replicas=2 \
  --set prometheus.prometheusSpec.thanos.create=true \
  --set prometheus.prometheusSpec.thanos.objectStorageConfig.existingSecret.name=thanos-storage \
  --set prometheus.prometheusSpec.thanos.objectStorageConfig.existingSecret.key=config
```

The key settings here are:

- `externalLabels`: Tags every metric with the cluster name and region so you can filter in the central dashboard
- `retention=24h`: Keep only recent data locally since Thanos handles long-term storage
- `thanos.create=true`: Adds the Thanos sidecar to each Prometheus pod

Create the object storage config for Thanos to upload metric blocks:

```yaml
# thanos-storage-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: thanos-storage
  namespace: monitoring
type: Opaque
stringData:
  config: |
    type: S3
    config:
      bucket: talos-metrics
      endpoint: s3.amazonaws.com
      region: us-east-1
      access_key: YOUR_ACCESS_KEY
      secret_key: YOUR_SECRET_KEY
```

## Monitoring Talos-Specific Metrics

Talos Linux exposes its own metrics through the machine API. You want to scrape these in addition to standard Kubernetes metrics. Create a ServiceMonitor or use a Prometheus scrape config:

```yaml
# talos-metrics-scrape.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-additional-scrape
  namespace: monitoring
data:
  talos-nodes.yaml: |
    - job_name: 'talos-nodes'
      static_configs:
        - targets:
            - '10.0.1.10:9100'  # control plane 1
            - '10.0.1.11:9100'  # control plane 2
            - '10.0.1.12:9100'  # control plane 3
            - '10.0.1.20:9100'  # worker 1
            - '10.0.1.21:9100'  # worker 2
      relabel_configs:
        - source_labels: [__address__]
          target_label: instance
```

## Setting Up the Central Thanos Query Layer

On your management cluster (or a dedicated monitoring cluster), deploy Thanos Query, Thanos Store, and Thanos Compactor:

```bash
# Install Thanos components on the central cluster
helm install thanos bitnami/thanos \
  --namespace monitoring \
  --create-namespace \
  --set query.enabled=true \
  --set queryFrontend.enabled=true \
  --set storegateway.enabled=true \
  --set compactor.enabled=true \
  --set ruler.enabled=false \
  --set objstoreConfig="$(cat thanos-storage-config.yaml)"
```

Configure Thanos Query to discover Thanos Sidecars in each cluster. If clusters are network-reachable, you can point directly at them:

```yaml
# thanos-query-values.yaml
query:
  stores:
    # Thanos sidecars in each cluster
    - "dnssrv+_grpc._tcp.monitoring-thanos-discovery.monitoring.svc.cluster.local"
  extraFlags:
    - "--store=cluster-a-thanos-sidecar.example.com:10901"
    - "--store=cluster-b-thanos-sidecar.example.com:10901"
    - "--store=cluster-c-thanos-sidecar.example.com:10901"
  replicaLabels:
    - prometheus_replica
```

If direct connectivity is not possible, use Thanos Receive instead. Each cluster pushes metrics to the central Thanos Receive endpoint:

```yaml
# On each cluster, configure Prometheus to remote-write
prometheus:
  prometheusSpec:
    remoteWrite:
      - url: "https://thanos-receive.monitoring.example.com/api/v1/receive"
        headers:
          THANOS-TENANT: "cluster-a"
```

## Central Grafana Setup

Deploy Grafana on the central monitoring cluster and point it at Thanos Query:

```bash
helm install grafana grafana/grafana \
  --namespace monitoring \
  --set datasources."datasources\.yaml".apiVersion=1 \
  --set datasources."datasources\.yaml".datasources[0].name=Thanos \
  --set datasources."datasources\.yaml".datasources[0].type=prometheus \
  --set datasources."datasources\.yaml".datasources[0].url=http://thanos-query:9090 \
  --set datasources."datasources\.yaml".datasources[0].access=proxy \
  --set datasources."datasources\.yaml".datasources[0].isDefault=true
```

### Multi-Cluster Dashboards

Create dashboards that leverage the cluster label to show all clusters side by side:

```json
{
  "panels": [
    {
      "title": "CPU Usage by Cluster",
      "targets": [
        {
          "expr": "avg by (cluster) (rate(node_cpu_seconds_total{mode!=\"idle\"}[5m]))",
          "legendFormat": "{{cluster}}"
        }
      ]
    },
    {
      "title": "Memory Usage by Cluster",
      "targets": [
        {
          "expr": "1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)",
          "legendFormat": "{{cluster}} - {{instance}}"
        }
      ]
    }
  ]
}
```

Some useful PromQL queries for multi-cluster monitoring:

```promql
# Cluster health overview - nodes not ready
sum by (cluster) (kube_node_status_condition{condition="Ready",status="false"})

# Pod restarts across all clusters
sum by (cluster, namespace) (increase(kube_pod_container_status_restarts_total[1h])) > 5

# API server latency per cluster
histogram_quantile(0.99, sum by (cluster, le) (rate(apiserver_request_duration_seconds_bucket[5m])))

# etcd leader changes
sum by (cluster) (increase(etcd_server_leader_changes_seen_total[1h]))
```

## Centralized Alerting

Set up alerting rules in the central Thanos Ruler or in Alertmanager. Alerts should include the cluster label so you know which cluster is affected:

```yaml
# multi-cluster-alerts.yaml
groups:
  - name: multi-cluster
    rules:
      - alert: ClusterNodeNotReady
        expr: kube_node_status_condition{condition="Ready",status="false"} == 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Node not ready in cluster {{ $labels.cluster }}"
          description: "Node {{ $labels.node }} in cluster {{ $labels.cluster }} has been not ready for 5 minutes."

      - alert: ClusterHighMemoryUsage
        expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) > 0.9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage in cluster {{ $labels.cluster }}"

      - alert: ClusterMetricsStale
        expr: time() - max by (cluster) (prometheus_build_info) > 600
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "No metrics from cluster {{ $labels.cluster }} for 10+ minutes"
```

The last alert is particularly important - it detects when a cluster stops sending metrics, which could indicate a complete cluster failure.

## Log Aggregation

Metrics are only half the story. Centralize logs from all clusters using Loki or Elasticsearch:

```bash
# Install Promtail on each cluster to ship logs
helm install promtail grafana/promtail \
  --namespace monitoring \
  --set config.clients[0].url="https://loki.monitoring.example.com/loki/api/v1/push" \
  --set config.snippets.extraRelabelConfigs[0].target_label=cluster \
  --set config.snippets.extraRelabelConfigs[0].replacement=cluster-a
```

In Grafana, you can now correlate metrics and logs across all clusters from a single interface.

## Summary

Centralized monitoring for multiple Talos Linux clusters follows the same patterns as any multi-cluster Kubernetes monitoring setup. The key ingredients are external labels on every metric, a centralized aggregation layer like Thanos, shared dashboards with cluster-level filtering, and alerts that clearly identify which cluster has a problem. Talos Linux simplifies the node-level monitoring since every node runs the same immutable OS - no need to worry about monitoring divergent system configurations across your fleet. Focus your dashboards on cluster health, workload performance, and the aggregation pipeline itself.
