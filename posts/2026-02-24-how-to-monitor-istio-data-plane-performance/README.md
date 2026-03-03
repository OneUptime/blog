# How to Monitor Istio Data Plane Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Monitoring, Data Plane, Envoy, Observability

Description: How to set up comprehensive monitoring for Istio data plane performance including sidecar metrics, connection health, and throughput tracking.

---

The data plane is where your actual traffic flows - through the Envoy sidecar proxies attached to every pod. Monitoring it well means you can catch performance degradation early, understand capacity limits, and troubleshoot issues quickly. Istio exposes a rich set of metrics from every sidecar, and knowing which ones to watch and how to interpret them makes all the difference.

## What to Monitor

Data plane monitoring covers four areas:

1. **Request performance**: Latency, error rates, throughput per service
2. **Proxy health**: CPU, memory, connection counts per sidecar
3. **Connection behavior**: Pool utilization, circuit breaker trips, TLS handshakes
4. **Configuration state**: Proxy sync status, config staleness

## Setting Up Prometheus for Istio Metrics

Istio sidecars expose metrics on port 15020 (merged with application metrics) or port 15090 (Envoy-only metrics). Prometheus needs to scrape these endpoints.

If you are using the Istio Prometheus integration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enablePrometheusMerge: true
    defaultConfig:
      proxyStatsMatcher:
        inclusionPrefixes:
        - cluster.outbound
        - cluster.inbound
        - listener
        - http.inbound
        - upstream_cx
        - upstream_rq
        - downstream_cx
        - downstream_rq
```

The `proxyStatsMatcher` controls which detailed Envoy stats are exported. Without this, only the standard Istio metrics are available.

## Key Request Metrics

These are the bread-and-butter metrics for understanding service health:

```text
# Request rate per service
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)

# Error rate (5xx) per service
sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_service)
/ sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)

# p50 latency per service
histogram_quantile(0.5, sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service))

# p99 latency per service
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service))

# Request size
histogram_quantile(0.99, sum(rate(istio_request_bytes_bucket{reporter="destination"}[5m])) by (le, destination_service))

# Response size
histogram_quantile(0.99, sum(rate(istio_response_bytes_bucket{reporter="destination"}[5m])) by (le, destination_service))
```

The `reporter` label is important. `reporter="destination"` gives you server-side metrics (from the receiving sidecar), while `reporter="source"` gives client-side metrics. The difference between the two at the same percentile roughly corresponds to network latency.

## Proxy Resource Metrics

Monitor how much each sidecar consumes:

```text
# CPU usage per sidecar
sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])) by (pod, namespace)

# Memory usage per sidecar
container_memory_working_set_bytes{container="istio-proxy"}

# Top CPU-consuming sidecars
topk(10, sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])) by (pod, namespace))

# Aggregate sidecar resource usage per namespace
sum(container_memory_working_set_bytes{container="istio-proxy"}) by (namespace)
```

## Connection Pool Metrics

Track how connections are being used:

```text
# Active connections per upstream service
envoy_cluster_upstream_cx_active

# Connection overflow (circuit breaker)
sum(rate(envoy_cluster_upstream_cx_overflow[5m])) by (cluster_name)

# Pending request overflow
sum(rate(envoy_cluster_upstream_rq_pending_overflow[5m])) by (cluster_name)

# New connection rate
sum(rate(envoy_cluster_upstream_cx_total[5m])) by (cluster_name)

# Connection destroy rate
sum(rate(envoy_cluster_upstream_cx_destroy[5m])) by (cluster_name)
```

A high connection creation rate relative to active connections indicates poor connection reuse. Connection overflow is a critical metric - it means requests are being rejected because the pool is exhausted.

## TLS Metrics

Monitor mTLS handshake performance:

```text
# TLS handshake count
sum(rate(envoy_cluster_ssl_handshake[5m])) by (cluster_name)

# TLS connection errors
sum(rate(envoy_cluster_ssl_connection_error[5m])) by (cluster_name)

# Active TLS connections
envoy_cluster_ssl_connections_total
```

A high TLS handshake rate means connections are not being reused effectively. Each handshake adds latency and CPU overhead.

## Building a Grafana Dashboard

Create a dashboard with these panels:

**Service Overview Row:**
- Request rate by service (graph)
- Error rate by service (graph)
- p50/p99 latency by service (graph)

**Proxy Health Row:**
- Sidecar CPU usage distribution (heatmap)
- Sidecar memory usage distribution (heatmap)
- Top 10 CPU-heavy sidecars (table)

**Connection Health Row:**
- Active connections by service (graph)
- Connection overflow rate (graph with alert threshold)
- TLS handshake rate (graph)

**Data Plane Summary Row:**
- Total sidecars in mesh (single stat)
- Total request rate (single stat)
- Overall error rate (single stat)
- Aggregate sidecar resource usage (single stat)

Example panel configuration for request rate:

```json
{
  "title": "Request Rate by Service",
  "type": "timeseries",
  "targets": [
    {
      "expr": "sum(rate(istio_requests_total{reporter=\"destination\"}[5m])) by (destination_service)",
      "legendFormat": "{{ destination_service }}"
    }
  ]
}
```

## Setting Up Alerts

Define alerts for data plane health:

```yaml
groups:
- name: istio-data-plane
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_service)
      / sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Error rate above 5% for {{ $labels.destination_service }}"

  - alert: HighLatency
    expr: |
      histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service)) > 1000
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "p99 latency above 1s for {{ $labels.destination_service }}"

  - alert: ConnectionPoolExhausted
    expr: sum(rate(envoy_cluster_upstream_cx_overflow[5m])) by (cluster_name) > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Connection pool overflow for {{ $labels.cluster_name }}"

  - alert: SidecarHighMemory
    expr: container_memory_working_set_bytes{container="istio-proxy"} > 200e6
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "Sidecar memory above 200MB in {{ $labels.pod }}"

  - alert: SidecarCPUThrottled
    expr: |
      rate(container_cpu_cfs_throttled_seconds_total{container="istio-proxy"}[5m]) > 0.1
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Sidecar CPU throttled in {{ $labels.pod }}"
```

## Using Kiali for Visual Monitoring

Kiali provides a visual representation of your mesh topology and data plane health:

```bash
kubectl port-forward svc/kiali -n istio-system 20001:20001
```

Kiali shows:
- Service graph with real-time traffic flow
- Error rate indicators on edges
- Latency distribution per service
- Configuration validation

It is great for quick visual inspection but not a replacement for detailed Prometheus-based dashboards.

## Monitoring at Scale

In large meshes, the volume of metrics can overwhelm your monitoring stack. Be selective about what you collect:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: selective-metrics
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: ALL_METRICS
        mode: CLIENT_AND_SERVER
      tagOverrides:
        source_canonical_revision:
          operation: REMOVE
        destination_canonical_revision:
          operation: REMOVE
```

Removing high-cardinality labels reduces the total number of time series in Prometheus. With 100 services and 10 versions each, removing the revision label alone eliminates thousands of time series.

Good data plane monitoring is the foundation of operating Istio confidently. When you can see request rates, error rates, latency, and resource usage at a glance, problems become obvious before they impact users. Set up the dashboards and alerts once, and they pay for themselves every time they catch an issue early.
