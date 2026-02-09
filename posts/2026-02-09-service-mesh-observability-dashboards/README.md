# How to Set Up Service Mesh Observability Dashboards Comparing Istio and Linkerd Golden Signals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Linkerd, Observability, Monitoring, Grafana, Prometheus

Description: Learn how to build comprehensive observability dashboards comparing Istio and Linkerd golden signals including latency, traffic, errors, and saturation metrics for effective service mesh monitoring.

---

Golden signals (latency, traffic, errors, saturation) are the foundation of service observability. Both Istio and Linkerd provide these metrics, but with different implementations and collection mechanisms. This guide shows you how to build unified dashboards that compare both service meshes for informed decision-making.

## Understanding Golden Signals in Service Meshes

The four golden signals are latency (response time), traffic (request rate), errors (failure rate), and saturation (resource utilization). Service meshes collect these automatically by intercepting all service-to-service communication.

Istio uses Envoy proxies that emit detailed metrics about every request. Linkerd uses lightweight Rust-based proxies optimized for low overhead. Both export Prometheus metrics but with different label schemas and metric names.

For teams evaluating service meshes or running hybrid deployments, comparing metrics side-by-side helps understand performance characteristics and operational differences.

## Prerequisites

You need two Kubernetes clusters, one running Istio and one running Linkerd. Alternatively, run both meshes in different namespaces on the same cluster.

For Istio:

```bash
istioctl install --set profile=demo
kubectl label namespace demo istio-injection=enabled
```

For Linkerd:

```bash
linkerd install | kubectl apply -f -
kubectl annotate namespace demo linkerd.io/inject=enabled
```

Deploy the same application in both namespaces for accurate comparison.

## Deploying Prometheus Federation

Set up Prometheus to scrape metrics from both service meshes:

```yaml
# prometheus-federated.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    # Scrape Istio metrics
    - job_name: 'istio-mesh'
      kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
          - istio-system
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: prometheus
    # Scrape Linkerd metrics
    - job_name: 'linkerd-mesh'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - linkerd
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_container_port_name]
        action: keep
        regex: admin-http
```

Deploy Prometheus:

```bash
kubectl create namespace monitoring
kubectl apply -f prometheus-federated.yaml
```

## Creating Unified Grafana Dashboard

Build a Grafana dashboard that shows golden signals for both meshes:

```json
{
  "dashboard": {
    "title": "Service Mesh Comparison: Istio vs Linkerd",
    "panels": [
      {
        "title": "Request Rate (Traffic)",
        "targets": [
          {
            "expr": "sum(rate(istio_requests_total[5m]))",
            "legendFormat": "Istio Total RPS"
          },
          {
            "expr": "sum(rate(request_total[5m]))",
            "legendFormat": "Linkerd Total RPS"
          }
        ]
      },
      {
        "title": "P95 Latency Comparison",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le))",
            "legendFormat": "Istio P95"
          },
          {
            "expr": "histogram_quantile(0.95, sum(rate(response_latency_ms_bucket[5m])) by (le))",
            "legendFormat": "Linkerd P95"
          }
        ]
      },
      {
        "title": "Error Rate (5xx)",
        "targets": [
          {
            "expr": "sum(rate(istio_requests_total{response_code=~\"5..\"}[5m])) / sum(rate(istio_requests_total[5m]))",
            "legendFormat": "Istio Error Rate"
          },
          {
            "expr": "sum(rate(response_total{classification=\"failure\"}[5m])) / sum(rate(response_total[5m]))",
            "legendFormat": "Linkerd Error Rate"
          }
        ]
      }
    ]
  }
}
```

## Querying Traffic Metrics

Compare request rates between meshes:

```promql
# Istio request rate per service
sum by (destination_service) (
  rate(istio_requests_total[5m])
)

# Linkerd request rate per service
sum by (dst_service) (
  rate(request_total[5m])
)
```

The metrics have different label names. Istio uses `destination_service` while Linkerd uses `dst_service`. Use relabeling to normalize:

```yaml
# prometheus-relabel.yaml
scrape_configs:
- job_name: 'linkerd-normalized'
  metric_relabel_configs:
  - source_labels: [dst_service]
    target_label: destination_service
  - source_labels: [request_total]
    target_label: istio_requests_total
```

## Comparing Latency Distribution

Analyze latency percentiles:

```promql
# Istio latency percentiles
histogram_quantile(0.50, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service))
histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service))
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service))

# Linkerd latency percentiles
histogram_quantile(0.50, sum(rate(response_latency_ms_bucket[5m])) by (le, dst_service))
histogram_quantile(0.95, sum(rate(response_latency_ms_bucket[5m])) by (le, dst_service))
histogram_quantile(0.99, sum(rate(response_latency_ms_bucket[5m])) by (le, dst_service))
```

Create a heatmap showing latency distribution differences.

## Measuring Error Rates

Compare error handling:

```promql
# Istio success rate
sum(rate(istio_requests_total{response_code!~\"5..\"}[5m])) / sum(rate(istio_requests_total[5m]))

# Linkerd success rate
sum(rate(response_total{classification=\"success\"}[5m])) / sum(rate(response_total[5m]))
```

Linkerd classifies responses as success/failure automatically. Istio requires you to define success based on status codes.

## Analyzing Saturation Metrics

Compare resource usage:

```promql
# Istio proxy memory usage
container_memory_usage_bytes{container="istio-proxy"}

# Linkerd proxy memory usage
container_memory_usage_bytes{container="linkerd-proxy"}

# Istio proxy CPU usage
rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])

# Linkerd proxy CPU usage
rate(container_cpu_usage_seconds_total{container="linkerd-proxy"}[5m])
```

Linkerd proxies typically use less memory due to their Rust implementation versus Envoy's C++.

## Creating SLO Dashboards

Define and track Service Level Objectives:

```yaml
# slo-config.yaml
slos:
- name: "API Latency"
  istio_query: "histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le)) < 100"
  linkerd_query: "histogram_quantile(0.95, sum(rate(response_latency_ms_bucket[5m])) by (le)) < 100"
  target: 99.9
- name: "API Availability"
  istio_query: "sum(rate(istio_requests_total{response_code!~\"5..\"}[5m])) / sum(rate(istio_requests_total[5m]))"
  linkerd_query: "sum(rate(response_total{classification=\"success\"}[5m])) / sum(rate(response_total[5m]))"
  target: 99.95
```

## Monitoring Control Plane Health

Compare control plane overhead:

```promql
# Istio control plane CPU
sum(rate(container_cpu_usage_seconds_total{namespace="istio-system"}[5m]))

# Linkerd control plane CPU
sum(rate(container_cpu_usage_seconds_total{namespace="linkerd"}[5m]))

# Istio control plane memory
sum(container_memory_usage_bytes{namespace="istio-system"})

# Linkerd control plane memory
sum(container_memory_usage_bytes{namespace="linkerd"})
```

## Building Alert Rules

Create alerts comparing both meshes:

```yaml
# alerts.yaml
groups:
- name: service-mesh-comparison
  rules:
  - alert: IstioHighLatency
    expr: histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le)) > 1000
    annotations:
      summary: "Istio P95 latency exceeds 1 second"
  - alert: LinkerdHighLatency
    expr: histogram_quantile(0.95, sum(rate(response_latency_ms_bucket[5m])) by (le)) > 1000
    annotations:
      summary: "Linkerd P95 latency exceeds 1 second"
  - alert: IstioErrorRateHigh
    expr: sum(rate(istio_requests_total{response_code=~\"5..\"}[5m])) / sum(rate(istio_requests_total[5m])) > 0.01
    annotations:
      summary: "Istio error rate exceeds 1%"
  - alert: LinkerdErrorRateHigh
    expr: sum(rate(response_total{classification=\"failure\"}[5m])) / sum(rate(response_total[5m])) > 0.01
    annotations:
      summary: "Linkerd error rate exceeds 1%"
```

## Conclusion

Unified observability dashboards comparing Istio and Linkerd golden signals help teams make informed service mesh decisions. Both meshes provide latency, traffic, error, and saturation metrics but with different implementations.

Use Prometheus federation to collect metrics from both meshes. Normalize label names for easier comparison. Build Grafana dashboards showing side-by-side metrics for the four golden signals.

Monitor control plane resource usage to understand operational overhead. Set up alerts that fire when either mesh exceeds SLO thresholds. This comprehensive observability approach ensures you can evaluate and operate service meshes effectively.
