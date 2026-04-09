# How to Set Up Multi-Cluster Monitoring with Custom Labels in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Prometheus, Monitoring, Kubernetes

Description: Configure custom cluster labels in Rook-Ceph Prometheus metrics to differentiate multiple Ceph clusters in a shared Prometheus or Grafana instance.

---

## Overview

When monitoring multiple Rook-Ceph clusters from a single Prometheus or Grafana instance (using remote_write or federation), all clusters emit metrics with the same names. Without custom labels, there is no way to distinguish which cluster a metric belongs to. Rook supports injecting custom external labels into all Ceph metrics.

## Enable Monitoring and Add Custom Labels

First, enable monitoring in the CephCluster CRD. The `monitoring` section configures the Prometheus metrics endpoint but does not support injecting custom metric labels directly:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  monitoring:
    enabled: true
    externalMgrEndpoints:
      - ip: "192.168.1.10"
    externalMgrPrometheusPort: 9283
```

To inject custom labels into scraped metrics, use `relabelings` in the ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rook-ceph-mgr
  namespace: rook-ceph
spec:
  endpoints:
  - port: http-metrics
    path: /metrics
    interval: 5s
    relabelings:
    - targetLabel: ceph_cluster
      replacement: "production-us-east"
    - targetLabel: datacenter
      replacement: "us-east-1"
    - sourceLabels: [__meta_kubernetes_namespace]
      targetLabel: kubernetes_namespace
```

## Prometheus External Labels for Remote Write

Configure Prometheus external labels so all metrics federated to a central instance carry cluster identification:

```yaml
# Prometheus values (kube-prometheus-stack)
prometheus:
  prometheusSpec:
    externalLabels:
      cluster: production-us-east
      environment: production
      region: us-east-1
    remoteWrite:
    - url: "https://central-prometheus.example.com/api/v1/write"
      writeRelabelConfigs:
      - sourceLabels: [__name__]
        regex: "ceph_.*"
        action: keep
```

## Query Multi-Cluster Metrics in Grafana

With cluster labels in place, Grafana dashboard queries can filter by cluster:

```text
# Total cluster capacity for production-us-east
sum(ceph_cluster_total_bytes{ceph_cluster="production-us-east"})

# Compare OSD counts across all clusters
count by (ceph_cluster) (ceph_osd_up)
```

## Create a Grafana Variable for Cluster Selection

In Grafana, add a template variable to switch between clusters:

```text
Type: Query
Query: label_values(ceph_health_status, ceph_cluster)
Label: Ceph Cluster
Multi-value: true
```

Use `$ceph_cluster` in all panel queries to filter to the selected cluster.

## Federation Configuration

For Prometheus federation pulling metrics from multiple child instances:

```yaml
scrape_configs:
- job_name: federate-ceph-clusters
  honor_labels: true
  metrics_path: /federate
  params:
    match[]:
      - '{job="rook-ceph"}'
  static_configs:
  - targets:
    - prometheus-us-east.example.com:9090
    - prometheus-eu-west.example.com:9090
```

## Summary

Multi-cluster Rook-Ceph monitoring requires consistent label injection to differentiate metrics from separate clusters. Using ServiceMonitor `relabelings`, Prometheus `externalLabels`, or both ensures every metric carries a `ceph_cluster` label. This enables centralized dashboards and alerts that clearly identify which cluster is experiencing an issue.
