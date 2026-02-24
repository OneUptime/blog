# How to Monitor Cross-Cluster Traffic in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Monitoring, Multi-Cluster, Prometheus, Observability

Description: How to set up comprehensive monitoring for cross-cluster traffic in Istio using Prometheus, Grafana, and Istio's built-in telemetry.

---

When you run Istio across multiple clusters, monitoring cross-cluster traffic becomes essential. You need to know how much traffic flows between clusters, which services communicate across cluster boundaries, what the latency looks like, and when things start failing. Without this visibility, troubleshooting multi-cluster issues is basically guessing.

This guide covers how to set up monitoring for cross-cluster Istio traffic using Prometheus, Grafana, and Istio's telemetry features.

## Understanding Istio's Cross-Cluster Metrics

Istio's sidecar proxies automatically generate metrics for every request they handle. For cross-cluster traffic, the key metrics include labels that identify the source and destination clusters.

The most important metrics for cross-cluster monitoring are:

- `istio_requests_total` - Total request count with source/destination labels
- `istio_request_duration_milliseconds` - Request latency histogram
- `istio_tcp_sent_bytes_total` - TCP bytes sent
- `istio_tcp_received_bytes_total` - TCP bytes received

These metrics include labels like `source_cluster`, `destination_cluster`, `source_workload`, and `destination_workload` that let you slice traffic by cluster.

## Setting Up Prometheus for Multi-Cluster

Each cluster typically runs its own Prometheus instance. For cross-cluster visibility, you have two options: federated Prometheus or Thanos/Cortex.

**Option 1: Prometheus Federation**

In each cluster, configure Prometheus with cluster-specific external labels:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: istio-system
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      external_labels:
        cluster: cluster-a
    scrape_configs:
    - job_name: 'envoy-stats'
      metrics_path: /stats/prometheus
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_container_name]
        action: keep
        regex: istio-proxy
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: (\d+)
        replacement: $1
    - job_name: 'istiod'
      kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
          - istio-system
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: istiod
```

Set up a central Prometheus to federate from each cluster:

```yaml
scrape_configs:
- job_name: 'federate-cluster-a'
  honor_labels: true
  metrics_path: /federate
  params:
    'match[]':
    - '{__name__=~"istio_.*"}'
  static_configs:
  - targets:
    - prometheus-cluster-a.example.com:9090

- job_name: 'federate-cluster-b'
  honor_labels: true
  metrics_path: /federate
  params:
    'match[]':
    - '{__name__=~"istio_.*"}'
  static_configs:
  - targets:
    - prometheus-cluster-b.example.com:9090
```

**Option 2: Thanos Sidecar**

For larger deployments, Thanos gives you a global view of metrics across clusters without the limitations of federation.

Deploy the Thanos sidecar alongside Prometheus in each cluster:

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
        image: prom/prometheus:v2.45.0
        args:
        - --storage.tsdb.min-block-duration=2h
        - --storage.tsdb.max-block-duration=2h
        - --web.enable-lifecycle
      - name: thanos-sidecar
        image: thanosio/thanos:v0.32.0
        args:
        - sidecar
        - --tsdb.path=/prometheus
        - --prometheus.url=http://localhost:9090
        - --objstore.config-file=/etc/thanos/bucket.yaml
```

## Key Prometheus Queries for Cross-Cluster Traffic

Once you have metrics flowing, here are the queries you need.

**Total cross-cluster request rate:**

```promql
sum(rate(istio_requests_total{source_cluster!=destination_cluster}[5m])) by (source_cluster, destination_cluster)
```

**Cross-cluster error rate:**

```promql
sum(rate(istio_requests_total{source_cluster!=destination_cluster, response_code=~"5.*"}[5m]))
/
sum(rate(istio_requests_total{source_cluster!=destination_cluster}[5m]))
```

**Cross-cluster latency (p99):**

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{source_cluster!=destination_cluster}[5m]))
  by (le, source_cluster, destination_cluster)
)
```

**Top talkers across clusters:**

```promql
topk(10,
  sum(rate(istio_requests_total{source_cluster!=destination_cluster}[5m]))
  by (source_workload, destination_workload, source_cluster, destination_cluster)
)
```

**Cross-cluster bandwidth:**

```promql
sum(rate(istio_tcp_sent_bytes_total{source_cluster!=destination_cluster}[5m])) by (source_cluster, destination_cluster)
```

## Building Grafana Dashboards

Create a Grafana dashboard specifically for cross-cluster traffic. Here is a dashboard JSON snippet for a key panel:

```json
{
  "title": "Cross-Cluster Request Rate",
  "type": "timeseries",
  "datasource": "Prometheus",
  "targets": [
    {
      "expr": "sum(rate(istio_requests_total{source_cluster!=destination_cluster}[5m])) by (source_cluster, destination_cluster)",
      "legendFormat": "{{source_cluster}} -> {{destination_cluster}}"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "reqps"
    }
  }
}
```

Your dashboard should include panels for:

- Request rate by cluster pair
- Error rate by cluster pair
- Latency percentiles (p50, p95, p99) by cluster pair
- Bandwidth usage between clusters
- Top services communicating across clusters

## Setting Up Alerts

Define alerting rules for cross-cluster traffic anomalies:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cross-cluster-alerts
  namespace: monitoring
spec:
  groups:
  - name: cross-cluster
    rules:
    - alert: CrossClusterHighErrorRate
      expr: |
        sum(rate(istio_requests_total{source_cluster!=destination_cluster, response_code=~"5.*"}[5m]))
        /
        sum(rate(istio_requests_total{source_cluster!=destination_cluster}[5m]))
        > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Cross-cluster error rate exceeds 5%"

    - alert: CrossClusterHighLatency
      expr: |
        histogram_quantile(0.99,
          sum(rate(istio_request_duration_milliseconds_bucket{source_cluster!=destination_cluster}[5m])) by (le)
        ) > 1000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Cross-cluster p99 latency exceeds 1 second"

    - alert: CrossClusterTrafficDrop
      expr: |
        sum(rate(istio_requests_total{source_cluster!=destination_cluster}[5m]))
        < 0.1 * sum(rate(istio_requests_total{source_cluster!=destination_cluster}[5m] offset 1h))
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "Cross-cluster traffic dropped by more than 90%"
```

## Using Kiali for Cross-Cluster Visualization

Kiali provides a service graph that can visualize cross-cluster traffic flows. To enable multi-cluster support, configure Kiali with access to both clusters:

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  clustering:
    clusters:
    - name: cluster-a
      secret_name: cluster-a-secret
    - name: cluster-b
      secret_name: cluster-b-secret
  external_services:
    prometheus:
      url: http://prometheus.monitoring:9090
    grafana:
      url: http://grafana.monitoring:3000
```

## Distributed Tracing for Cross-Cluster Requests

For end-to-end visibility into requests that span clusters, set up distributed tracing with Jaeger or Zipkin.

Configure Istio to send traces:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 10.0
  values:
    global:
      tracer:
        zipkin:
          address: jaeger-collector.observability:9411
```

Deploy a centralized Jaeger instance that receives traces from both clusters. Use the Jaeger Collector with Kafka or Elasticsearch as a backend to handle traces from multiple sources.

```bash
kubectl apply -f - --context=cluster-a <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
data:
  config.yaml: |
    receivers:
      zipkin:
        endpoint: 0.0.0.0:9411
    exporters:
      otlp:
        endpoint: central-collector.example.com:4317
    service:
      pipelines:
        traces:
          receivers: [zipkin]
          exporters: [otlp]
EOF
```

## Practical Tips

- Start with coarse-grained metrics (cluster-to-cluster totals) and drill down only when investigating issues.
- Set retention policies that make sense. You probably do not need per-request metrics from six months ago, but aggregated daily stats are useful.
- Watch out for cardinality explosion. Cross-cluster metrics multiply the label combinations, which can overwhelm Prometheus if you are not careful with your recording rules.
- Use recording rules for expensive queries that run frequently on dashboards.

Monitoring cross-cluster Istio traffic requires investment in infrastructure and configuration, but it pays off significantly when you need to troubleshoot issues or understand traffic patterns across your fleet.
