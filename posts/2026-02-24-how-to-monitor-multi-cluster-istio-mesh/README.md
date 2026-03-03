# How to Monitor Multi-Cluster Istio Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Monitoring, Multi-Cluster, Prometheus, Grafana, Observability

Description: How to set up monitoring for a multi-cluster Istio service mesh with Prometheus federation, Grafana dashboards, and cross-cluster metrics aggregation.

---

Monitoring a single Istio cluster is relatively straightforward. You deploy Prometheus, point it at the Istio metrics, and visualize in Grafana. But when you have multiple clusters forming a single mesh, you need a strategy for collecting, aggregating, and correlating metrics from all clusters.

This post covers three approaches: Prometheus federation, remote write to a central store, and using Thanos for global querying.

## What Metrics Istio Exposes

Before getting into multi-cluster specifics, here is a quick recap of the key Istio metrics. Every sidecar proxy generates these automatically:

- `istio_requests_total` - request count by response code, source, destination
- `istio_request_duration_milliseconds` - request latency histogram
- `istio_request_bytes` - request size
- `istio_response_bytes` - response size
- `istio_tcp_connections_opened_total` - TCP connections opened
- `istio_tcp_connections_closed_total` - TCP connections closed

These metrics include labels like `source_cluster`, `destination_cluster`, `source_workload`, `destination_workload`, which are critical for multi-cluster visibility.

## Approach 1: Prometheus Federation

The simplest approach is to run Prometheus in each cluster and set up a federated Prometheus that scrapes aggregated metrics from each cluster's Prometheus.

### Per-Cluster Prometheus

Deploy Prometheus in each cluster using the Istio monitoring addons:

```bash
kubectl apply -f samples/addons/prometheus.yaml --context="${CTX_CLUSTER1}"
kubectl apply -f samples/addons/prometheus.yaml --context="${CTX_CLUSTER2}"
```

Or use the Prometheus Operator with a ServiceMonitor for Istio:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istio-component-monitor
  namespace: istio-system
spec:
  selector:
    matchExpressions:
    - key: istio
      operator: In
      values:
      - pilot
  endpoints:
  - port: http-monitoring
    interval: 15s
---
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: envoy-stats-monitor
  namespace: istio-system
spec:
  selector:
    matchExpressions:
    - key: security.istio.io/tlsMode
      operator: Exists
  podMetricsEndpoints:
  - path: /stats/prometheus
    interval: 15s
```

### Federated Prometheus

Set up a central Prometheus that federates from each cluster's Prometheus. You need to expose each cluster's Prometheus externally (via LoadBalancer or Ingress):

```yaml
# Central federation Prometheus configuration
global:
  scrape_interval: 30s
  evaluation_interval: 30s

scrape_configs:
- job_name: 'cluster1-federation'
  honor_labels: true
  metrics_path: '/federate'
  params:
    'match[]':
    - '{__name__=~"istio_.*"}'
    - '{__name__=~"pilot_.*"}'
  static_configs:
  - targets:
    - 'prometheus-cluster1.example.com:9090'
    labels:
      cluster: cluster1

- job_name: 'cluster2-federation'
  honor_labels: true
  metrics_path: '/federate'
  params:
    'match[]':
    - '{__name__=~"istio_.*"}'
    - '{__name__=~"pilot_.*"}'
  static_configs:
  - targets:
    - 'prometheus-cluster2.example.com:9090'
    labels:
      cluster: cluster2
```

## Approach 2: Remote Write to Central Store

A better approach for production is to have each cluster's Prometheus remote-write metrics to a central time-series database like Cortex, Mimir, or Victoria Metrics.

Configure Prometheus in each cluster with remote write:

```yaml
# prometheus-values.yaml for Helm chart
prometheus:
  prometheusSpec:
    remoteWrite:
    - url: https://mimir.example.com/api/v1/push
      headers:
        X-Scope-OrgID: istio-mesh
      writeRelabelConfigs:
      - sourceLabels: [__name__]
        regex: 'istio_.*|pilot_.*'
        action: keep
    externalLabels:
      cluster: cluster1
```

The `externalLabels` setting is crucial. It adds a `cluster` label to every metric, so you can distinguish which cluster a metric came from in the central store.

For cluster2, use the same config but change the cluster label:

```yaml
    externalLabels:
      cluster: cluster2
```

## Approach 3: Thanos for Global Querying

Thanos provides a way to query across multiple Prometheus instances without moving data. Each cluster runs a Thanos Sidecar next to Prometheus, and a central Thanos Query component aggregates results.

Deploy Thanos Sidecar in each cluster:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
spec:
  template:
    spec:
      containers:
      - name: prometheus
        # ... existing prometheus container
      - name: thanos-sidecar
        image: quay.io/thanos/thanos:v0.34.0
        args:
        - sidecar
        - --tsdb.path=/prometheus
        - --prometheus.url=http://localhost:9090
        - --grpc-address=0.0.0.0:10901
        - --http-address=0.0.0.0:10902
        - --label=cluster="cluster1"
```

Then deploy Thanos Query centrally:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thanos-query
  namespace: monitoring
spec:
  template:
    spec:
      containers:
      - name: thanos-query
        image: quay.io/thanos/thanos:v0.34.0
        args:
        - query
        - --http-address=0.0.0.0:9090
        - --store=thanos-sidecar-cluster1.example.com:10901
        - --store=thanos-sidecar-cluster2.example.com:10901
```

## Grafana Dashboards for Multi-Cluster

Once you have aggregated metrics, set up Grafana dashboards that show cross-cluster traffic:

### Cross-Cluster Request Rate

```text
sum(rate(istio_requests_total{reporter="source"}[5m])) by (source_cluster, destination_cluster)
```

### Cross-Cluster Error Rate

```text
sum(rate(istio_requests_total{reporter="source", response_code=~"5.."}[5m])) by (source_cluster, destination_cluster)
/ sum(rate(istio_requests_total{reporter="source"}[5m])) by (source_cluster, destination_cluster)
```

### Cross-Cluster Latency (P99)

```text
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="source"}[5m]))
  by (le, source_cluster, destination_cluster)
)
```

### Control Plane Health Per Cluster

```text
# Proxy push time per cluster
histogram_quantile(0.99,
  sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le, cluster)
)

# Number of connected proxies per cluster
sum(pilot_xds) by (cluster)
```

## Monitoring East-West Gateway Health

For multi-network setups, the east-west gateway is a critical component. Monitor it specifically:

```text
# East-west gateway request rate
sum(rate(istio_requests_total{destination_workload="istio-eastwestgateway"}[5m])) by (cluster)

# East-west gateway error rate
sum(rate(istio_requests_total{destination_workload="istio-eastwestgateway", response_code=~"5.."}[5m])) by (cluster)

# Connection count to east-west gateway
sum(istio_tcp_connections_opened_total{destination_workload="istio-eastwestgateway"}) by (cluster)
```

## Setting Up Alerts

Key alerts for a multi-cluster Istio mesh:

```yaml
groups:
- name: istio-multi-cluster
  rules:
  - alert: CrossClusterErrorRateHigh
    expr: |
      sum(rate(istio_requests_total{response_code=~"5..", source_cluster!=destination_cluster}[5m]))
      / sum(rate(istio_requests_total{source_cluster!=destination_cluster}[5m])) > 0.05
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Cross-cluster error rate exceeds 5%"

  - alert: EastWestGatewayDown
    expr: |
      absent(up{job="istio-eastwestgateway"} == 1)
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "East-west gateway is not responding"

  - alert: RemoteClusterDisconnected
    expr: |
      pilot_remote_cluster_sync_timeouts_total > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Istiod lost connection to a remote cluster"
```

## Summary

Monitoring a multi-cluster Istio mesh requires aggregating metrics from all clusters into a single view. Prometheus federation works for smaller setups, remote write to a central store is better for production, and Thanos gives you global querying without moving data. Whichever approach you choose, make sure you add `cluster` labels to your metrics, build dashboards that show cross-cluster traffic patterns, and set up alerts for east-west gateway health and remote cluster connectivity.
