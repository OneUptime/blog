# How to Implement API Monitoring with Dapr and API Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Monitoring, API, Gateway, Observability

Description: Learn how to implement end-to-end API monitoring for Dapr microservices using API gateway metrics, Dapr telemetry, and Prometheus/Grafana dashboards.

---

## Overview

Monitoring APIs backed by Dapr microservices requires observability at two layers: the API gateway (for request rates, latency, and error rates from the external perspective) and the Dapr sidecar (for internal service health and resiliency metrics). Combining both gives you full visibility from client to service.

## Enabling Metrics in Kong Gateway

Deploy the Prometheus plugin on Kong to expose gateway metrics:

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongClusterPlugin
metadata:
  name: kong-prometheus
  annotations:
    kubernetes.io/ingress.class: kong
  labels:
    global: "true"
plugin: prometheus
config:
  per_consumer: true
  status_code_metrics: true
  latency_metrics: true
  bandwidth_metrics: true
  upstream_health_metrics: true
```

Kong exposes metrics at `http://kong-admin:8001/metrics`.

## Scraping Kong and Dapr Metrics with Prometheus

Configure Prometheus to scrape both Kong and Dapr sidecars:

```yaml
scrape_configs:
  - job_name: kong
    static_configs:
      - targets:
          - kong-admin.kong.svc:8001

  - job_name: dapr-sidecars
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_enabled]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_ip]
        replacement: "${1}:9090"
        target_label: __address__
    metrics_path: /metrics
```

## Key Metrics to Monitor

**Gateway metrics from Kong:**
- `kong_http_requests_total` - Total HTTP requests by status code and route
- `kong_request_latency_ms` - Request latency distribution
- `kong_upstream_latency_ms` - Upstream service latency

**Dapr sidecar metrics:**
- `dapr_http_server_request_count` - Requests received by the sidecar
- `dapr_http_server_latency` - Sidecar request processing latency
- `dapr_resiliency_activations_total` - Resiliency policy activations

## Building a Grafana Dashboard

Create a dashboard panel for request error rate:

```bash
# Error rate PromQL query
sum(rate(kong_http_requests_total{code=~"5.."}[5m])) /
  sum(rate(kong_http_requests_total[5m])) * 100
```

Create a panel for P99 latency:

```bash
# P99 end-to-end latency
histogram_quantile(0.99,
  sum(rate(kong_request_latency_ms_bucket[5m])) by (le, service)
)
```

## Alerting on SLO Violations

Define Prometheus alerting rules for common SLO targets:

```yaml
groups:
  - name: api-slo-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(kong_http_requests_total{code=~"5.."}[5m])) /
          sum(rate(kong_http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "API error rate exceeds 1%"

      - alert: HighP99Latency
        expr: |
          histogram_quantile(0.99, sum(rate(kong_request_latency_ms_bucket[5m])) by (le)) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API P99 latency exceeds 1000ms"
```

## Correlating Gateway and Dapr Traces

Enable distributed tracing to correlate gateway requests with Dapr service calls:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing-config
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin.monitoring.svc:9411/api/v2/spans
```

The `traceparent` header propagated from Kong flows through Dapr service invocations, allowing you to trace a request end-to-end in Jaeger or Zipkin.

## Summary

End-to-end API monitoring for Dapr services requires combining gateway-level metrics from Kong or NGINX with Dapr sidecar telemetry. Prometheus scrapes both layers, Grafana visualizes request rates, latency distributions, and error rates, and distributed tracing ties individual requests across the full call chain. Setting SLO-based alerts on these combined metrics ensures you catch degradation before it impacts end users.
