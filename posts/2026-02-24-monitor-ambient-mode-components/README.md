# How to Monitor Ambient Mode Components

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Monitoring, Prometheus, Kubernetes

Description: A hands-on guide to monitoring Istio ambient mode components including ztunnel and waypoint proxies using Prometheus, Grafana, and built-in metrics.

---

Monitoring Istio ambient mode is a bit different from monitoring sidecar-based Istio. Instead of collecting metrics from hundreds of sidecar proxies, you are monitoring a handful of ztunnel DaemonSet pods and optional waypoint proxy deployments. The metrics are still there, but they come from different sources and have different characteristics.

## What to Monitor

In ambient mode, you have three main components to monitor:

1. **ztunnel** - The per-node L4 proxy (DaemonSet)
2. **Waypoint proxies** - Optional L7 proxies (Deployments)
3. **istiod** - The control plane (same as sidecar mode)

Each component exposes Prometheus metrics, and together they give you full visibility into your mesh traffic.

## ztunnel Metrics

ztunnel exposes metrics on port 15020. These are primarily L4 (TCP) metrics since ztunnel does not process HTTP:

```bash
# Port-forward to a ztunnel pod's metrics endpoint
kubectl port-forward -n istio-system $(kubectl get pod -n istio-system -l app=ztunnel -o jsonpath='{.items[0].metadata.name}') 15020:15020

# Fetch metrics
curl -s http://localhost:15020/metrics
```

Key ztunnel metrics:

| Metric | Description |
|--------|-------------|
| `istio_tcp_connections_opened_total` | Total TCP connections opened |
| `istio_tcp_connections_closed_total` | Total TCP connections closed |
| `istio_tcp_sent_bytes_total` | Bytes sent over TCP connections |
| `istio_tcp_received_bytes_total` | Bytes received over TCP connections |
| `istio_tcp_connection_duration_seconds` | Duration of TCP connections |

These metrics include labels for source and destination workloads, namespaces, and service accounts, which lets you build detailed dashboards.

## Waypoint Proxy Metrics

Waypoint proxies are Envoy instances, so they expose the full set of Istio L7 metrics:

```bash
# Port-forward to a waypoint proxy
WAYPOINT_POD=$(kubectl get pod -n my-app -l gateway.istio.io/managed=istio.io-mesh-controller -o jsonpath='{.items[0].metadata.name}')
kubectl port-forward -n my-app $WAYPOINT_POD 15020:15020

# Fetch metrics
curl -s http://localhost:15020/stats/prometheus
```

Key waypoint metrics:

| Metric | Description |
|--------|-------------|
| `istio_requests_total` | Total HTTP requests with response code labels |
| `istio_request_duration_milliseconds` | Request latency distribution |
| `istio_request_bytes` | Request body size distribution |
| `istio_response_bytes` | Response body size distribution |

Since waypoint proxies handle L7 traffic, you get HTTP-specific labels like `response_code`, `request_protocol`, and `destination_service`.

## Setting Up Prometheus Scraping

To collect metrics from ambient mode components, configure Prometheus to scrape ztunnel and waypoint pods:

```yaml
# prometheus-config.yaml (additional scrape configs)
scrape_configs:
- job_name: 'ztunnel'
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_label_app]
    action: keep
    regex: ztunnel
  - source_labels: [__meta_kubernetes_namespace]
    action: keep
    regex: istio-system
  - source_labels: [__address__]
    action: replace
    target_label: __address__
    regex: (.+):.*
    replacement: $1:15020

- job_name: 'waypoint-proxies'
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_label_gateway_istio_io_managed]
    action: keep
    regex: istio.io-mesh-controller
  - source_labels: [__address__]
    action: replace
    target_label: __address__
    regex: (.+):.*
    replacement: $1:15020
```

If you are using the Prometheus Operator, create ServiceMonitor resources:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: ztunnel-monitor
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: ztunnel
  podMetricsEndpoints:
  - port: "15020"
    path: /metrics
    interval: 15s
---
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: waypoint-monitor
  namespace: my-app
spec:
  selector:
    matchLabels:
      gateway.istio.io/managed: istio.io-mesh-controller
  podMetricsEndpoints:
  - port: "15020"
    path: /stats/prometheus
    interval: 15s
```

## Useful Prometheus Queries

Here are some practical queries for monitoring ambient mode:

**Total request rate through waypoint proxies:**

```promql
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)
```

**Error rate for HTTP services:**

```promql
sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_service)
/
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)
```

**TCP connection count per ztunnel:**

```promql
sum(rate(istio_tcp_connections_opened_total[5m])) by (pod)
```

**Bytes transferred through ztunnel:**

```promql
sum(rate(istio_tcp_sent_bytes_total[5m])) by (source_workload, destination_workload)
```

**P99 latency through waypoint proxies:**

```promql
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service))
```

## Grafana Dashboards

The standard Istio Grafana dashboards work with ambient mode metrics, though some panels may need adjustment. You can import the Istio dashboards from the Istio repository:

```bash
# If using the Istio addons
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/prometheus.yaml
```

For custom dashboards, focus on:

- **ztunnel resource usage**: CPU, memory, and open connections per ztunnel pod
- **Waypoint proxy performance**: Request rate, latency, and error rate per waypoint
- **Control plane health**: istiod push latency, configuration errors, and xDS connection count

## Monitoring ztunnel Health

Beyond metrics, you should monitor ztunnel operational health:

```bash
# Check ztunnel readiness across all nodes
kubectl get pods -n istio-system -l app=ztunnel -o wide

# Check ztunnel resource consumption
kubectl top pods -n istio-system -l app=ztunnel

# Check for ztunnel restarts
kubectl get pods -n istio-system -l app=ztunnel -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].restartCount}{"\n"}{end}'
```

Set up alerts for ztunnel pod restarts and resource usage:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ztunnel-alerts
  namespace: istio-system
spec:
  groups:
  - name: ztunnel
    rules:
    - alert: ZtunnelHighRestarts
      expr: increase(kube_pod_container_status_restarts_total{container="ztunnel"}[1h]) > 3
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "ztunnel pod {{ $labels.pod }} has restarted {{ $value }} times in the last hour"
    - alert: ZtunnelHighMemory
      expr: container_memory_working_set_bytes{container="ztunnel"} / container_spec_memory_limit_bytes{container="ztunnel"} > 0.85
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "ztunnel pod {{ $labels.pod }} is using over 85% of its memory limit"
```

## Monitoring Waypoint Proxy Health

Waypoint proxies should also have alerting:

```yaml
- alert: WaypointHighErrorRate
  expr: >
    sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_service)
    /
    sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)
    > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Service {{ $labels.destination_service }} has error rate above 5%"
```

## Kiali and Ambient Mode

Kiali, the Istio observability dashboard, supports ambient mode. It can visualize traffic flows through ztunnel and waypoint proxies:

```bash
# Install Kiali
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/kiali.yaml

# Access the dashboard
kubectl port-forward svc/kiali -n istio-system 20001:20001
```

In the Kiali dashboard, ambient mode workloads show up with indicators showing whether they are using ztunnel only or have a waypoint proxy assigned.

## Summary

Monitoring ambient mode means watching three components: ztunnel for L4 metrics and health, waypoint proxies for L7 metrics, and istiod for control plane health. Set up Prometheus scraping for both ztunnel and waypoint pods, create dashboards for key metrics like connection counts, request rates, and latency, and configure alerts for pod restarts and error rates. The monitoring surface area is smaller than sidecar mode because you have fewer proxy instances to track.
