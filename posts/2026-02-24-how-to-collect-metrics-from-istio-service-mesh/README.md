# How to Collect Metrics from Istio Service Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Metrics, Observability, Prometheus, Monitoring

Description: A practical guide to collecting and understanding the metrics Istio generates from your service mesh including proxy, service, and control plane metrics.

---

One of the biggest reasons teams adopt Istio is the observability it provides without changing application code. Every request flowing through your mesh gets measured automatically - latency, error rates, throughput, and more. But collecting these metrics and making sense of them requires understanding what Istio generates, where it stores data, and how to get it into your monitoring stack.

## What Metrics Does Istio Generate?

Istio generates metrics at three levels:

**Proxy-level metrics** come from each Envoy sidecar. These are detailed statistics about connections, request processing, circuit breaking, and more. There are thousands of them per proxy.

**Service-level metrics** are the ones most people care about. These track request counts, latency, and sizes for HTTP, gRPC, and TCP traffic. They include labels for source, destination, response code, and other dimensions.

**Control plane metrics** come from istiod itself. They track things like certificate issuance, configuration pushes, and xDS connection counts.

## The Default Metrics

Out of the box, Istio generates these key HTTP/gRPC metrics:

| Metric | Type | Description |
|--------|------|-------------|
| `istio_requests_total` | Counter | Total number of requests |
| `istio_request_duration_milliseconds` | Histogram | Request duration |
| `istio_request_bytes` | Histogram | Request body sizes |
| `istio_response_bytes` | Histogram | Response body sizes |

And for TCP traffic:

| Metric | Type | Description |
|--------|------|-------------|
| `istio_tcp_sent_bytes_total` | Counter | Total bytes sent |
| `istio_tcp_received_bytes_total` | Counter | Total bytes received |
| `istio_tcp_connections_opened_total` | Counter | Total connections opened |
| `istio_tcp_connections_closed_total` | Counter | Total connections closed |

Each metric comes with a rich set of labels that let you slice and dice the data.

## Setting Up Prometheus to Scrape Istio

Prometheus is the standard way to collect Istio metrics. Each Envoy sidecar exposes metrics on port 15020 at the `/stats/prometheus` endpoint. istiod exposes its metrics on port 15014.

If you're using the Prometheus Operator, create ServiceMonitor resources:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istio-component-monitor
  namespace: istio-system
spec:
  jobLabel: istio
  targetLabels:
    - app
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
```

For Envoy sidecar metrics, you need a PodMonitor since the sidecars don't have their own Service:

```yaml
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
  jobLabel: envoy-stats
  podMetricsEndpoints:
    - path: /stats/prometheus
      port: http-envoy-prom
      interval: 15s
      relabelings:
        - action: keep
          sourceLabels: [__meta_kubernetes_pod_container_name]
          regex: "istio-proxy"
        - action: keep
          sourceLabels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
```

If you're running plain Prometheus (not the Operator), add scrape configs to your `prometheus.yml`:

```yaml
scrape_configs:
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

  - job_name: 'envoy-stats'
    metrics_path: /stats/prometheus
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_container_name]
        action: keep
        regex: "istio-proxy"
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:15020
        target_label: __address__
```

## Verifying Metrics Collection

After setting up scraping, verify metrics are flowing. Port-forward to a sidecar and check its metrics endpoint:

```bash
kubectl port-forward <pod-name> 15020:15020 -n default

curl localhost:15020/stats/prometheus | grep istio_requests_total
```

You should see lines like:

```
istio_requests_total{response_code="200",source_workload="frontend",destination_workload="api-service",...} 1523
```

Check that Prometheus is actually scraping these targets:

```bash
kubectl port-forward svc/prometheus 9090:9090 -n monitoring

# Then open http://localhost:9090/targets in your browser
```

All the Istio targets should show as UP.

## Understanding Metric Labels

The labels on Istio metrics are what make them powerful. Here are the most important ones:

```
istio_requests_total{
  reporter="source",                          # or "destination"
  source_workload="frontend",
  source_workload_namespace="default",
  source_principal="...",                      # SPIFFE identity
  destination_workload="api-service",
  destination_workload_namespace="default",
  destination_service="api-service.default.svc.cluster.local",
  destination_principal="...",
  request_protocol="http",
  response_code="200",
  response_flags="-",
  connection_security_policy="mutual_tls",
  grpc_response_status="",
}
```

The `reporter` label is important - each request gets reported twice: once by the source proxy and once by the destination proxy. When querying, you usually want to pick one to avoid double counting:

```promql
# Use reporter="destination" for server-side view
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_workload)
```

## Reducing Metric Volume

All these labels create high cardinality, which means lots of time series in Prometheus. For large meshes, this can be a problem. You can reduce the labels Istio generates:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyStatsMatcher: {}
    enablePrometheusMerge: true
```

You can also use Telemetry API to control what gets collected:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-labels
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          tagOverrides:
            source_principal:
              operation: REMOVE
            destination_principal:
              operation: REMOVE
            request_protocol:
              operation: REMOVE
```

This removes the `source_principal`, `destination_principal`, and `request_protocol` labels from all metrics, significantly reducing cardinality.

## Collecting Metrics from istiod

The control plane metrics tell you about the health of Istio itself:

```bash
kubectl port-forward svc/istiod 15014:15014 -n istio-system

curl localhost:15014/metrics | head -50
```

Key control plane metrics to track:

- `pilot_xds_pushes` - configuration pushes to sidecars
- `pilot_proxy_convergence_time` - time for config to reach all proxies
- `citadel_server_csr_count` - certificate signing requests
- `pilot_xds` - number of connected proxies
- `pilot_conflict_inbound_listener` - configuration conflicts

## Mesh-Wide Metrics Overview

Once metrics are flowing into Prometheus, you can build a mesh-wide view:

```promql
# Total request rate across the mesh
sum(rate(istio_requests_total{reporter="destination"}[5m]))

# Error rate (5xx responses)
sum(rate(istio_requests_total{reporter="destination",response_code=~"5.."}[5m]))
/
sum(rate(istio_requests_total{reporter="destination"}[5m]))

# P99 latency across all services
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le))
```

These queries give you a quick health check of your entire service mesh.

## Next Steps

Getting metrics flowing is just the beginning. From here, you'll want to set up Grafana dashboards for visualization (Istio provides several pre-built dashboards), configure alerting rules for SLO violations, and tune which metrics you collect to balance observability with storage costs. The default metrics Istio provides cover most use cases, and the Telemetry API gives you fine-grained control when you need to customize things further.
