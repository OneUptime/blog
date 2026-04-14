# How to Monitor Dapr Serverless Application Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Serverless, Monitoring, Observability, Prometheus, Metric

Description: A practical guide to monitoring Dapr serverless application performance using built-in metrics, Prometheus scraping, and distributed tracing integration.

---

## Why Monitor Dapr Serverless Performance

Serverless Dapr applications can exhibit latency spikes and cold-start penalties that are invisible without proper instrumentation. Dapr exposes Prometheus metrics on port 9090 by default and integrates with OpenTelemetry for distributed tracing. Monitoring both gives you a complete picture of sidecar and application-level performance.

## Enabling Dapr Metrics

Enable metrics collection in your Dapr configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: monitoring-config
  namespace: default
spec:
  metrics:
    enabled: true
    port: 9090
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://otel-collector:9411/api/v2/spans"
```

Annotate your deployment to expose the metrics port:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "my-service"
  dapr.io/metrics-port: "9090"
  dapr.io/enable-metrics: "true"
```

## Key Metrics to Watch

The most important Dapr metrics for serverless workloads:

```bash
# Service invocation count and latency
dapr_runtime_service_invocation_req_sent_total
dapr_runtime_service_invocation_req_recv_total
dapr_runtime_service_invocation_res_recv_latency_ms

# State store operations
dapr_component_state_count
dapr_component_state_latencies

# Pub/sub message processing
dapr_component_pubsub_ingress_count
dapr_component_pubsub_ingress_latencies
dapr_component_pubsub_egress_count

# Sidecar HTTP/gRPC performance
dapr_http_server_request_count
dapr_grpc_io_server_completed_rpcs
```

## Prometheus Scrape Configuration

```yaml
scrape_configs:
  - job_name: "dapr-sidecars"
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_enabled]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_ip]
        target_label: __address__
        replacement: "$1:9090"
      - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_app_id]
        target_label: app_id
```

## Grafana Dashboard Queries

Key PromQL queries for a Dapr performance dashboard:

```bash
# Average gRPC server latency
rate(dapr_grpc_io_server_server_latency_sum[5m]) /
rate(dapr_grpc_io_server_server_latency_count[5m])

# HTTP error rate per service
sum(rate(dapr_http_server_response_count{status=~"5.."}[5m]))
  by (app_id)

# State store p95 latency
histogram_quantile(0.95,
  rate(dapr_component_state_latencies_bucket[5m]))
```

## Application-Level Custom Metrics

Emit custom metrics from your application alongside Dapr's built-in ones:

```python
from prometheus_client import Histogram, Counter, start_http_server
import time

REQUEST_LATENCY = Histogram(
    "app_request_latency_seconds",
    "Request latency in seconds",
    ["operation"]
)

ERRORS = Counter("app_errors_total", "Total errors", ["type"])

def process_event(event):
    with REQUEST_LATENCY.labels(operation="process_event").time():
        try:
            # business logic here
            pass
        except Exception as e:
            ERRORS.labels(type=type(e).__name__).inc()
            raise

start_http_server(8080)
```

## Alerting on SLO Violations

```yaml
groups:
  - name: dapr-serverless-slos
    rules:
      - alert: DaprHighLatency
        expr: |
          histogram_quantile(0.99,
            rate(dapr_http_server_latency_bucket[5m])) > 500
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Dapr p99 latency exceeds 500ms"
```

## Summary

Monitoring Dapr serverless performance requires enabling Prometheus metrics on the sidecar, scraping pod-level endpoints with Kubernetes service discovery, and tracking both service invocation and state store latencies. Pair these metrics with distributed traces and custom application counters to build complete SLO dashboards. Set alerts on p99 thresholds to catch degradation before users notice.
