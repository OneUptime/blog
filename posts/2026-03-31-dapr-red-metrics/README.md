# How to Implement RED Metrics (Rate, Errors, Duration) for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Metric, RED, Prometheus, Observability

Description: Build RED (Rate, Errors, Duration) dashboards for Dapr microservices by combining Dapr sidecar metrics with custom application metrics in Prometheus.

---

## The RED Method

RED metrics provide a minimal but complete picture of service health:
- **Rate**: requests per second
- **Errors**: error rate (failed requests / total requests)
- **Duration**: request latency distribution (p50, p95, p99)

Dapr sidecar metrics expose all three for service invocation, pub/sub, and state operations.

## Dapr Metrics Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: metrics-config
spec:
  metrics:
    enabled: true
    rules:
      - name: dapr_runtime_service_invocation_req_sent_total
        labels:
          - name: method
            regex:
              "orders/": "orders/.+"
```

## Key Dapr Prometheus Metrics

```bash
# Service invocation metrics (HTTP)
dapr_http_server_request_count                          # Rate & Errors (has app_id, method, status labels)
dapr_http_server_latency_bucket                         # Duration (histogram)

# Service invocation metrics (runtime)
dapr_runtime_service_invocation_req_sent_total          # Rate (sender side)
dapr_runtime_service_invocation_req_recv_total          # Rate (receiver side)
dapr_runtime_service_invocation_res_recv_total          # Response count
dapr_runtime_service_invocation_res_recv_latency_ms_bucket  # Duration (histogram)

# Pub/sub metrics
dapr_component_pubsub_ingress_count             # Subscribe rate
dapr_component_pubsub_egress_count              # Publish rate
dapr_component_pubsub_ingress_latencies_bucket  # Subscribe duration

# State store metrics
dapr_component_state_count                      # Operations (filter by operation label: get, set, delete)
dapr_component_state_latencies_bucket           # State operation duration
```

## Prometheus Rules for RED Metrics

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-red-metrics
  namespace: monitoring
spec:
  groups:
  - name: dapr.red
    interval: 30s
    rules:
    # Rate: requests per second per service
    - record: dapr:service_invocation:rate5m
      expr: |
        sum(rate(dapr_http_server_request_count[5m])) by (app_id, method)

    # Error rate: failed requests / total
    - record: dapr:service_invocation:error_rate5m
      expr: |
        sum(rate(dapr_http_server_request_count{status=~"5.."}[5m])) by (app_id)
        /
        sum(rate(dapr_http_server_request_count[5m])) by (app_id)

    # Duration: p99 latency
    - record: dapr:service_invocation:latency_p99
      expr: |
        histogram_quantile(0.99,
          sum(rate(dapr_http_server_latency_bucket[5m])) by (app_id, le)
        )

    # Pub/sub error rate
    - record: dapr:pubsub:drop_rate5m
      expr: |
        sum(rate(dapr_component_pubsub_ingress_count{status="drop"}[5m])) by (component, topic)
        /
        sum(rate(dapr_component_pubsub_ingress_count[5m])) by (component, topic)
```

## Grafana Dashboard JSON Panels

```json
{
  "panels": [
    {
      "title": "Request Rate (req/s)",
      "type": "timeseries",
      "targets": [{
        "expr": "sum(dapr:service_invocation:rate5m) by (app_id)",
        "legendFormat": "{{app_id}}"
      }]
    },
    {
      "title": "Error Rate (%)",
      "type": "timeseries",
      "targets": [{
        "expr": "dapr:service_invocation:error_rate5m * 100",
        "legendFormat": "{{app_id}}"
      }],
      "fieldConfig": {
        "defaults": { "thresholds": { "steps": [
          {"color": "green", "value": null},
          {"color": "yellow", "value": 1},
          {"color": "red", "value": 5}
        ]}}
      }
    },
    {
      "title": "P99 Latency (ms)",
      "type": "timeseries",
      "targets": [{
        "expr": "dapr:service_invocation:latency_p99",
        "legendFormat": "{{app_id}}"
      }]
    }
  ]
}
```

## Alerting on RED Thresholds

```yaml
groups:
- name: dapr.alerts
  rules:
  - alert: DaprHighErrorRate
    expr: dapr:service_invocation:error_rate5m > 0.05
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High error rate for {{ $labels.app_id }}"
      description: "Error rate is {{ $value | humanizePercentage }}"

  - alert: DaprHighLatency
    expr: dapr:service_invocation:latency_p99 > 1000
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High p99 latency for {{ $labels.app_id }}: {{ $value }}ms"
```

## Summary

Dapr's Prometheus metrics provide all the raw data needed for RED dashboards. Recording rules pre-compute rate, error, and duration metrics for efficient querying. A three-panel Grafana dashboard showing request rate, error rate, and p99 latency gives on-call engineers immediate situational awareness. Set alerting thresholds appropriate to your SLOs and you have a complete observability baseline with no custom instrumentation.
