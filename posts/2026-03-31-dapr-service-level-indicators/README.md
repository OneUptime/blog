# How to Implement Service Level Indicators (SLI) for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SLI, Observability, Monitoring, Reliability

Description: Learn how to define and collect Service Level Indicators for Dapr-powered microservices using built-in metrics and Prometheus.

---

## Understanding SLIs for Dapr

A Service Level Indicator (SLI) is a quantitative measure of a service's behavior - typically availability, latency, or throughput. In a Dapr-based microservices architecture, SLIs should be measured at the sidecar level to capture the full picture of inter-service communication.

Common Dapr SLIs include:
- Request success rate (availability)
- Request latency (p50, p99)
- Pub/Sub message delivery rate
- State store operation latency

## Enabling Metrics Collection

First, enable metrics on your Dapr control plane and sidecars:

```bash
# Enable metrics in Dapr Helm chart
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set global.prometheus.enabled=true
```

Configure a Prometheus scrape job:

```yaml
scrape_configs:
  - job_name: 'dapr-sidecars'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_enabled]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_ip]
        target_label: __address__
        replacement: '$1:9090'
```

## Availability SLI

Measure the ratio of successful requests to total requests:

```bash
# Prometheus query for HTTP availability SLI (5-minute window)
sum(rate(dapr_http_server_request_count{app_id="checkout",status=~"2.."}[5m]))
/
sum(rate(dapr_http_server_request_count{app_id="checkout"}[5m]))
```

For gRPC-based service invocation:

```bash
sum(rate(dapr_grpc_io_server_completed_rpcs{app_id="checkout",grpc_server_status="OK"}[5m]))
/
sum(rate(dapr_grpc_io_server_completed_rpcs{app_id="checkout"}[5m]))
```

## Latency SLI

Dapr exposes request latency histograms. Query the 99th percentile:

```bash
# p99 latency for service invocation
histogram_quantile(0.99,
  sum(rate(dapr_http_server_latency_bucket{app_id="checkout"}[5m])) by (le)
)
```

Define latency buckets in your Dapr configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  metrics:
    latencyDistributionBuckets:
      - 1
      - 5
      - 10
      - 25
      - 50
      - 100
      - 250
      - 500
      - 1000
```

## Pub/Sub Delivery SLI

For event-driven services, measure message delivery success:

```bash
# Message delivery rate
sum(rate(dapr_component_pubsub_ingress_count{app_id="order-processor",success="true"}[5m]))
/
sum(rate(dapr_component_pubsub_ingress_count{app_id="order-processor"}[5m]))
```

## Recording SLI Rules

Use Prometheus recording rules to pre-compute SLIs for efficient querying:

```yaml
groups:
- name: dapr-slis
  interval: 30s
  rules:
  - record: dapr:availability:rate5m
    expr: |
      sum by (app_id) (
        rate(dapr_http_server_request_count{status=~"2.."}[5m])
      )
      /
      sum by (app_id) (
        rate(dapr_http_server_request_count[5m])
      )
```

## Summary

Implementing SLIs for Dapr involves leveraging the rich Prometheus metrics emitted by each sidecar, structuring them around availability, latency, and throughput dimensions. Recording rules and well-defined metric queries give your team a consistent, real-time view of service health that forms the foundation for setting SLOs and SLAs.
