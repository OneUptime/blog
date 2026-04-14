# How to Monitor Service Invocation Performance in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Performance, Monitoring, Prometheus, Metric

Description: Learn how to monitor Dapr service invocation performance using Prometheus metrics, Grafana dashboards, and distributed tracing to identify latency bottlenecks.

---

## Available Dapr Service Invocation Metrics

Dapr exposes Prometheus metrics for service invocation on port 9090 of the sidecar. Key metrics include:

| Metric | Description |
|--------|-------------|
| `dapr_http_server_request_count` | Total requests received |
| `dapr_http_server_latency` | Server-side latency histogram |
| `dapr_http_client_completed_count` | Outbound request count |
| `dapr_http_client_roundtrip_latency` | Client-side latency histogram |
| `dapr_grpc_io_server_server_latency` | gRPC server latency |

## Scraping Metrics with Prometheus

Enable metrics in the Dapr sidecar:

```yaml
annotations:
  dapr.io/enable-metrics: "true"
  dapr.io/metrics-port: "9090"
  prometheus.io/scrape: "true"
  prometheus.io/path: "/"
  prometheus.io/port: "9090"
```

Configure Prometheus to scrape:

```yaml
scrape_configs:
  - job_name: 'dapr-sidecars'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: "${1}:${2}"
```

## Key PromQL Queries

```bash
# Average request latency per app
rate(dapr_http_client_roundtrip_latency_sum[5m]) / rate(dapr_http_client_roundtrip_latency_count[5m])

# Error rate per app
rate(dapr_http_client_completed_count{status!="200"}[5m])

# P99 latency by method
histogram_quantile(0.99, rate(dapr_http_server_latency_bucket[5m]))
```

## Setting Up the Dapr Grafana Dashboard

Import the official Dapr dashboard:

```bash
# Download official dashboard JSON
curl -o dapr-dashboard.json \
  https://raw.githubusercontent.com/dapr/dapr/master/grafana/grafana-system-services-dashboard.json

# Import via Grafana API
curl -X POST http://localhost:3000/api/dashboards/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <API_KEY>" \
  -d "{\"dashboard\": $(cat dapr-dashboard.json), \"overwrite\": true}"
```

## Distributed Tracing for Latency Analysis

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin:9411/api/v2/spans
```

With sampling rate `"1"`, every request is traced. In production, use `"0.1"` for 10% sampling.

## Identifying Slow Services

```bash
# Search for slow traces in Zipkin
curl "http://localhost:9411/api/v2/traces?minDuration=500000&limit=10"
# minDuration is in microseconds (500000 = 500ms)
```

## Summary

Monitor Dapr service invocation performance using Prometheus metrics scraped from the sidecar's port 9090. Use PromQL to query error rates and latency percentiles. Import the official Dapr Grafana dashboard for pre-built visualizations. Enable distributed tracing with Zipkin or Jaeger to identify slow service invocations across your microservice graph.
