# How to Monitor Dapr Performance Under Load

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Monitoring, Prometheus, Grafana, Performance

Description: Learn how to monitor Dapr sidecar performance under load using Prometheus metrics, Grafana dashboards, and distributed tracing.

---

## Overview

Monitoring Dapr under load reveals bottlenecks in sidecar resource usage, component latency, and error rates. Dapr exposes Prometheus metrics from each sidecar, enabling real-time visibility during load tests and production traffic spikes.

## Enabling Dapr Metrics

Enable metrics on each Dapr-enabled pod:

```yaml
annotations:
  dapr.io/enable-metrics: "true"
  dapr.io/metrics-port: "9090"
```

Configure Prometheus to scrape Dapr sidecars:

```yaml
scrape_configs:
- job_name: dapr-sidecar
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_enable_metrics]
    action: keep
    regex: "true"
  - source_labels: [__meta_kubernetes_pod_ip, __meta_kubernetes_pod_annotation_dapr_io_metrics_port]
    action: replace
    target_label: __address__
    regex: (.+);(.+)
    replacement: $1:$2
```

## Key Dapr Metrics to Watch

| Metric | Description |
|---|---|
| `dapr_http_server_request_count` | Total requests by method/status |
| `dapr_http_server_latency` | Request latency histogram |
| `dapr_component_pubsub_egress_count` | Pub/sub publish operations |
| `dapr_component_state_count{operation="get"}` | State store read operations |
| `dapr_component_state_count{operation="set"}` | State store write operations |
| `dapr_grpc_io_server_completed_rpcs` | gRPC completed RPCs |

## Grafana Dashboard Queries

Query P99 service invocation latency:

```promql
histogram_quantile(0.99,
  sum(rate(dapr_http_server_latency_bucket{
    app_id="order-service"
  }[5m])) by (le)
)
```

Query error rate by service:

```promql
sum(rate(dapr_http_server_request_count{
  app_id="order-service",
  status=~"5.."
}[5m])) /
sum(rate(dapr_http_server_request_count{
  app_id="order-service"
}[5m]))
```

## Setting Up Alerts

Alert on high sidecar error rate:

```yaml
groups:
- name: dapr-performance
  rules:
  - alert: DaprHighErrorRate
    expr: |
      sum(rate(dapr_http_server_request_count{status=~"5.."}[5m])) by (app_id)
      / sum(rate(dapr_http_server_request_count[5m])) by (app_id) > 0.01
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Dapr error rate above 1% for {{ $labels.app_id }}"
```

## Distributed Tracing Under Load

Enable tracing with a sampled rate to capture a representative subset:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: perf-config
spec:
  tracing:
    samplingRate: "0.05"  # 5% sampling under load
    zipkin:
      endpointAddress: http://jaeger-collector:9411/api/v2/spans
```

## Load Test and Monitor Together

Run a load test while watching Prometheus metrics:

```bash
# Terminal 1: Run load test
hey -n 100000 -c 200 \
  http://localhost:3500/v1.0/invoke/order-service/method/process

# Terminal 2: Watch key metrics
watch -n2 "kubectl top pods -l app=order-service --containers"
```

## Summary

Monitoring Dapr under load requires enabling Prometheus metrics via annotations, scraping sidecar metrics endpoints, and building Grafana dashboards for latency, throughput, and error rate. Alert on P99 latency and error rate thresholds, and use distributed tracing with a sampling rate appropriate to your traffic volume to diagnose bottlenecks.
