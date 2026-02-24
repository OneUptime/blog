# How to Monitor Data Plane Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Data Plane, Monitoring, Prometheus, Envoy, Performance

Description: Learn how to monitor Istio data plane performance using Prometheus metrics, Envoy stats, and practical dashboards for tracking latency and throughput.

---

Monitoring the data plane is how you keep tabs on every request flowing through your Istio mesh. The Envoy sidecars generate detailed metrics about traffic patterns, latency, error rates, and resource consumption. Getting visibility into these numbers is critical for spotting problems before your users do.

## What Metrics Does the Data Plane Expose?

Each Envoy sidecar exposes metrics on port 15090 at the `/stats/prometheus` endpoint. Istio also runs a merged metrics endpoint on port 15020 at `/stats/prometheus` that combines application and sidecar metrics.

The most important metrics from the sidecar fall into a few categories.

### Request Metrics

These are the workload-level metrics that Istio generates:

- `istio_requests_total` - Total request count, labeled with source, destination, response code, and more
- `istio_request_duration_milliseconds` - Request duration histogram
- `istio_request_bytes` - Request body size histogram
- `istio_response_bytes` - Response body size histogram

You can query these directly with Prometheus. For example, to get the request rate for a service:

```promql
rate(istio_requests_total{destination_service="service-b.default.svc.cluster.local"}[5m])
```

To get the 99th percentile latency:

```promql
histogram_quantile(0.99, rate(istio_request_duration_milliseconds_bucket{destination_service="service-b.default.svc.cluster.local"}[5m]))
```

To get the error rate (5xx responses):

```promql
rate(istio_requests_total{destination_service="service-b.default.svc.cluster.local", response_code=~"5.."}[5m])
/
rate(istio_requests_total{destination_service="service-b.default.svc.cluster.local"}[5m])
```

### TCP Metrics

For TCP traffic (non-HTTP):

- `istio_tcp_connections_opened_total` - Total TCP connections opened
- `istio_tcp_connections_closed_total` - Total TCP connections closed
- `istio_tcp_sent_bytes_total` - Bytes sent
- `istio_tcp_received_bytes_total` - Bytes received

### Envoy-Level Metrics

Beyond the Istio standard metrics, Envoy exposes a large number of its own stats. You can see them directly:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | head -50
```

Some useful Envoy stats to watch:

```bash
# Active connections
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep "downstream_cx_active"

# Upstream connection pool stats
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep "upstream_cx"

# Circuit breaker trips
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep "upstream_rq_pending_overflow"
```

## Setting Up Prometheus Scraping

If you installed Istio with the default profile, Prometheus scraping is usually already configured. But if you need to set it up manually, add these scrape configs to your Prometheus configuration:

```yaml
scrape_configs:
- job_name: 'envoy-stats'
  metrics_path: /stats/prometheus
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_container_name]
    action: keep
    regex: istio-proxy
  - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
    action: replace
    regex: ([^:]+)(?::\d+)?;(\d+)
    replacement: $1:15020
    target_label: __address__
```

Verify that Prometheus is scraping your sidecars:

```bash
# Port-forward to Prometheus
kubectl port-forward svc/prometheus -n istio-system 9090:9090

# Then check targets in the browser at localhost:9090/targets
```

## Building Useful Dashboards

Knowing which metrics exist is one thing. Building dashboards that actually help you spot problems is another. Here are the panels I recommend.

### The Four Golden Signals

Google's SRE book defines four golden signals. Istio gives you all of them out of the box:

**Latency** - How long requests take:

```promql
# p50 latency by service
histogram_quantile(0.50, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service))

# p99 latency by service
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service))
```

**Traffic** - How many requests per second:

```promql
sum(rate(istio_requests_total[5m])) by (destination_service)
```

**Errors** - What percentage of requests fail:

```promql
sum(rate(istio_requests_total{response_code=~"5.."}[5m])) by (destination_service)
/
sum(rate(istio_requests_total[5m])) by (destination_service)
```

**Saturation** - How full are your resources. For the data plane, this is about connection pool utilization:

```promql
# Pending requests (close to overflow means the connection pool is saturated)
envoy_cluster_upstream_rq_pending_active
```

### Sidecar Resource Usage

Track memory and CPU of your sidecars to know if they need more resources:

```promql
# Memory usage of istio-proxy containers
container_memory_working_set_bytes{container="istio-proxy"}

# CPU usage of istio-proxy containers
rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])
```

If sidecar memory is growing over time without stabilizing, you might have a memory leak or your mesh configuration might be too large (too many services being pushed to each sidecar).

## Monitoring Config Push Performance

The control plane pushes configuration to data plane proxies. If these pushes are slow, your data plane will be slow to react to changes:

```promql
# Time taken to push config to proxies
histogram_quantile(0.99, sum(rate(pilot_proxy_push_time_bucket[5m])) by (le))

# Number of pushes
rate(pilot_xds_pushes[5m])

# Push errors
rate(pilot_xds_push_errors[5m])
```

If push times are high (over a few seconds), you may need to scale istiod or use Sidecar resources to reduce the amount of configuration pushed to each proxy.

## Using Kiali for Visualization

Kiali provides a visual graph of your service mesh traffic. Install it if you have not already:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml
```

Access the dashboard:

```bash
istioctl dashboard kiali
```

Kiali shows you:
- Service dependency graph with real-time traffic flow
- Request rates and error rates on each edge
- Latency percentiles
- Configuration validation issues

It is especially useful for quickly spotting which service-to-service connections have elevated error rates.

## Setting Up Alerts

Monitoring is not very useful without alerting. Here are some Prometheus alerting rules that make sense for the data plane:

```yaml
groups:
- name: istio-data-plane
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(istio_requests_total{response_code=~"5.."}[5m])) by (destination_service)
      /
      sum(rate(istio_requests_total[5m])) by (destination_service)
      > 0.05
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High error rate on {{ $labels.destination_service }}"

  - alert: HighLatency
    expr: |
      histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service))
      > 1000
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "P99 latency above 1s on {{ $labels.destination_service }}"

  - alert: SidecarHighMemory
    expr: |
      container_memory_working_set_bytes{container="istio-proxy"} > 500 * 1024 * 1024
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Sidecar using more than 500MB memory in pod {{ $labels.pod }}"
```

## Checking Data Plane Health Quickly

For a quick health check of the data plane, combine a few commands:

```bash
# Check all proxies are synced
istioctl proxy-status

# Check for any configuration validation issues
istioctl analyze --all-namespaces

# Get a quick summary of mesh traffic
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/debug/syncz | python3 -m json.tool | head -20
```

The data plane generates a wealth of metrics that tell you exactly what is happening with every request in your mesh. The key is to set up Prometheus to scrape those metrics, build dashboards around the four golden signals, and configure alerts so you know about problems before they escalate. The combination of Istio's standard metrics, raw Envoy stats, and tools like Kiali gives you complete visibility into your data plane performance.
