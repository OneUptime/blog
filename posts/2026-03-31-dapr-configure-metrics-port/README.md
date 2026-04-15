# How to Configure Dapr Metrics Port

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Metric, Prometheus, Port, Observability

Description: Configure Dapr's Prometheus metrics port, enable metric collection, and set up scraping to monitor sidecar performance and component health.

---

## Dapr Metrics Port Basics

Dapr exposes Prometheus-formatted metrics on port 9090 by default. These metrics cover sidecar performance, component operations, actor activity, and service invocation - giving you deep visibility into your microservices without code changes.

## Enabling and Configuring the Metrics Port

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "payment-service"
        dapr.io/enable-metrics: "true"
        dapr.io/metrics-port: "9090"
    spec:
      containers:
      - name: payment-service
        image: payment-service:latest
```

## Changing the Metrics Port

Change to avoid conflicts with your application's own metrics:

```yaml
# Use 9091 if your app exposes metrics on 9090
dapr.io/metrics-port: "9091"
```

Update the Prometheus scrape config accordingly:

```yaml
scrape_configs:
  - job_name: 'dapr-sidecars'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_enabled]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_metrics_port]
        action: replace
        target_label: __metrics_path__
        replacement: /metrics
      - source_labels: [__meta_kubernetes_pod_ip,
                        __meta_kubernetes_pod_annotation_dapr_io_metrics_port]
        separator: ':'
        target_label: __address__
```

## Key Metrics to Monitor

```bash
# Request rate per service
rate(dapr_http_server_request_count{app_id="payment-service"}[5m])

# Error rate
rate(dapr_http_server_request_count{app_id="payment-service",status=~"5.."}[5m])

# State store operation latency
histogram_quantile(0.99,
  rate(dapr_component_state_latencies_bucket{app_id="payment-service"}[5m])
)

# Pub/sub message ingress rate
rate(dapr_component_pubsub_ingress_count{app_id="payment-service"}[5m])
```

## Disabling Metrics

To reduce overhead in low-criticality services:

```yaml
dapr.io/enable-metrics: "false"
```

## Control Plane Metrics

Enable metrics for the Dapr control plane components:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set global.prometheus.enabled=true \
  --set global.prometheus.port=9090
```

Scrape control plane metrics:

```yaml
scrape_configs:
  - job_name: 'dapr-control-plane'
    static_configs:
      - targets:
        - dapr-operator.dapr-system:9090
        - dapr-sentry.dapr-system:9090
        - dapr-placement-server.dapr-system:9090
```

## Grafana Dashboard Setup

```bash
# Import the official Dapr dashboards from the Dapr GitHub repo:
# https://github.com/dapr/dapr/tree/master/grafana

helm install grafana grafana/grafana \
  --namespace monitoring \
  --set datasources."datasources\.yaml".datasources[0].url=http://prometheus-server.monitoring
```

## Summary

Configuring Dapr's metrics port correctly ensures Prometheus can scrape sidecar and control plane telemetry without conflicting with your application's own metrics. By combining Prometheus scrape configs with Dapr's annotation-based port configuration and Grafana dashboards, you get comprehensive, out-of-the-box observability for your entire microservices fleet.
