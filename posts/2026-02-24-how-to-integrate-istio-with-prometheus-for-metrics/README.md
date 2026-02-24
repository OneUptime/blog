# How to Integrate Istio with Prometheus for Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Prometheus, Metrics, Monitoring, Kubernetes, Observability

Description: A complete guide to setting up Prometheus with Istio for collecting service mesh metrics including request rates, latencies, and error rates.

---

Istio generates a rich set of metrics for every request flowing through the mesh. Envoy sidecars track request counts, latencies, response codes, connection stats, and more. Prometheus is the natural choice for collecting and storing these metrics because Istio is designed to work with it out of the box. Every sidecar exposes a Prometheus metrics endpoint, and with the right configuration, you get full visibility into your mesh without writing any instrumentation code.

## Quick Setup

If you just want to get Prometheus running with Istio for testing, use the sample addon:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
```

This deploys Prometheus into the `istio-system` namespace with scrape configs already set up for Istio. Verify it's running:

```bash
kubectl get pods -n istio-system -l app=prometheus
```

Access the Prometheus UI:

```bash
istioctl dashboard prometheus
```

This sample setup is for testing only. For production, you'll want to use a proper Prometheus deployment (Helm chart, Prometheus Operator, etc.).

## How Istio Exposes Metrics

Each Envoy sidecar exposes metrics on port 15090 at the `/stats/prometheus` path. The Istio agent (pilot-agent) also adds merged metrics from the application (if the app exposes Prometheus metrics) on port 15020 at `/stats/prometheus`.

The metrics merge feature combines sidecar metrics and application metrics into a single scrape endpoint, which simplifies Prometheus configuration.

### Key Ports

- **15090** - Envoy stats in Prometheus format (sidecar only)
- **15020** - Merged metrics from both sidecar and application (handled by pilot-agent)
- **15014** - Istiod metrics

## Prometheus Scrape Configuration

If you're running your own Prometheus instance, add these scrape configs:

```yaml
scrape_configs:
# Scrape Istio sidecar proxies
- job_name: 'envoy-stats'
  metrics_path: /stats/prometheus
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_container_name]
    action: keep
    regex: istio-proxy
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    action: drop
    regex: false
  - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
    action: replace
    regex: ([^:]+)(?::\d+)?;(\d+)
    replacement: $1:15090
    target_label: __address__
  - action: labelmap
    regex: __meta_kubernetes_pod_label_(.+)
  - source_labels: [__meta_kubernetes_namespace]
    action: replace
    target_label: namespace
  - source_labels: [__meta_kubernetes_pod_name]
    action: replace
    target_label: pod_name

# Scrape Istiod
- job_name: 'istiod'
  kubernetes_sd_configs:
  - role: endpoints
    namespaces:
      names:
      - istio-system
  relabel_configs:
  - source_labels: [__meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
    action: keep
    regex: istiod;http-monitoring
```

If you're using the Prometheus Operator with ServiceMonitor resources:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istio-component-monitor
  namespace: istio-system
spec:
  jobLabel: istio
  targetLabels: [app]
  selector:
    matchExpressions:
    - key: istio
      operator: In
      values:
      - pilot
  namespaceSelector:
    matchNames:
    - istio-system
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
  namespaceSelector:
    any: true
  podMetricsEndpoints:
  - path: /stats/prometheus
    port: http-envoy-prom
    interval: 15s
    relabelings:
    - action: keep
      sourceLabels: [__meta_kubernetes_pod_container_name]
      regex: istio-proxy
```

## Key Istio Metrics

Istio generates several categories of metrics. Here are the most important ones.

### Request Metrics

```promql
# Total request count
istio_requests_total

# Request duration
istio_request_duration_milliseconds_bucket
istio_request_duration_milliseconds_sum
istio_request_duration_milliseconds_count

# Request size
istio_request_bytes_bucket
istio_request_bytes_sum

# Response size
istio_response_bytes_bucket
istio_response_bytes_sum
```

The `istio_requests_total` metric has labels including:

- `source_workload` - The calling service
- `destination_workload` - The called service
- `response_code` - HTTP status code
- `request_protocol` - HTTP or gRPC
- `reporter` - `source` or `destination` (which proxy reported the metric)

### TCP Metrics

```promql
# TCP bytes sent
istio_tcp_sent_bytes_total

# TCP bytes received
istio_tcp_received_bytes_total

# TCP connections opened
istio_tcp_connections_opened_total

# TCP connections closed
istio_tcp_connections_closed_total
```

### Control Plane Metrics

```promql
# Config push latency
pilot_xds_push_time_bucket

# Number of connected proxies
pilot_xds_connections

# Push errors
pilot_xds_pushes{type="cds"}

# Config size
pilot_xds_config_size_bytes
```

## Useful PromQL Queries

### Request Rate by Service

```promql
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)
```

### Error Rate by Service

```promql
sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m]))
by (destination_service)
/
sum(rate(istio_requests_total{reporter="destination"}[5m]))
by (destination_service)
```

### P99 Latency by Service

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
  by (le, destination_service)
)
```

### Request Rate Between Specific Services

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  source_workload="productpage-v1",
  destination_workload="reviews-v1"
}[5m]))
```

### TCP Connection Rate

```promql
sum(rate(istio_tcp_connections_opened_total{reporter="destination"}[5m]))
by (destination_service)
```

## Customizing Metrics

Istio lets you customize which metrics are collected and what labels they carry using the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-metrics
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
        mode: CLIENT_AND_SERVER
      tagOverrides:
        request_host:
          operation: UPSERT
          value: "request.host"
```

To disable specific metrics (reduce cardinality and storage):

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-metrics
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_BYTES
        mode: CLIENT_AND_SERVER
      disabled: true
    - match:
        metric: RESPONSE_BYTES
        mode: CLIENT_AND_SERVER
      disabled: true
```

## Reducing Metric Cardinality

In large meshes, Istio metrics can create high cardinality that overwhelms Prometheus. Common strategies:

1. **Reduce labels.** Remove high-cardinality labels you don't need:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      extraStatTags: []
```

2. **Use the Sidecar resource to limit scope.** Fewer services visible to each proxy means fewer metric label combinations.

3. **Increase scrape interval.** Going from 15s to 30s halves the data volume:

```yaml
# In Prometheus scrape config
- job_name: 'envoy-stats'
  scrape_interval: 30s
```

4. **Use recording rules.** Pre-aggregate common queries to reduce query-time load:

```yaml
groups:
- name: istio-recording-rules
  rules:
  - record: istio:service:request_rate_5m
    expr: sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)
  - record: istio:service:error_rate_5m
    expr: |
      sum(rate(istio_requests_total{reporter="destination",response_code=~"5.."}[5m])) by (destination_service)
      / sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)
```

## Verifying Metrics Collection

Check that Prometheus is scraping your sidecars:

```bash
# Open Prometheus UI
istioctl dashboard prometheus
```

Go to Status > Targets. You should see entries for `envoy-stats` and `istiod` with state `UP`.

Run a test query:

```promql
istio_requests_total
```

If no results, check:
1. The scrape config targets the right ports
2. The sidecar metrics endpoint is accessible
3. Traffic is flowing through the mesh (no traffic = no metrics)

## Summary

Prometheus and Istio are a natural fit. Istio generates metrics automatically for every request, and Prometheus collects them efficiently. The key is getting the scrape configuration right and managing cardinality as your mesh grows. Start with the sample addon for testing, then move to a production-grade Prometheus deployment with proper storage, recording rules, and alerting for your production mesh.
