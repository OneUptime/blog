# How to Set Up Comprehensive Dapr Monitoring Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Monitoring, Grafana, Prometheus, Dashboard

Description: Learn how to set up a comprehensive Dapr monitoring dashboard in Grafana using Prometheus metrics from Dapr sidecars to track service health, latency, and throughput.

---

Dapr sidecars emit Prometheus metrics for service invocation, pub/sub, state store operations, and more. A comprehensive Grafana dashboard surfaces these metrics to give you visibility into your entire microservices mesh without writing custom instrumentation.

## Enable Dapr Metrics

Ensure metrics are enabled in the Dapr Configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
  namespace: production
spec:
  metrics:
    enabled: true
  mtls:
    enabled: true
```

Annotate deployments to expose the metrics port:

```yaml
metadata:
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "order-service"
    dapr.io/enable-metrics: "true"
    dapr.io/metrics-port: "9090"
```

## Configure Prometheus Scraping

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: dapr-metrics
  namespace: production
spec:
  selector:
    matchLabels:
      dapr.io/enabled: "true"
  podMetricsEndpoints:
  - port: dapr-metrics
    path: /metrics
    interval: 15s
```

## Key Dapr Metrics to Monitor

```bash
# Service invocation throughput
dapr_http_server_request_count{app_id, status_code, path}
dapr_grpc_io_server_completed_rpcs{app_id, grpc_server_method, grpc_server_status}

# Service invocation latency
dapr_http_server_latency_bucket{app_id, path}

# Pub/sub metrics
dapr_component_pubsub_ingress_count{app_id, topic, success}
dapr_component_pubsub_egress_count{app_id, topic, success}
dapr_component_pubsub_ingress_latencies_bucket{app_id, topic}

# State store metrics
dapr_component_state_count{app_id, operation="get", success}
dapr_component_state_count{app_id, operation="set", success}

# Sidecar resource usage
go_memstats_alloc_bytes{app_id}
process_cpu_seconds_total
```

## Grafana Dashboard JSON Panels

Key panels to include in your dashboard:

```json
{
  "panels": [
    {
      "title": "Request Rate (req/s)",
      "type": "graph",
      "targets": [{
        "expr": "sum(rate(dapr_http_server_request_count[5m])) by (app_id)",
        "legendFormat": "{{app_id}}"
      }]
    },
    {
      "title": "Error Rate (%)",
      "type": "graph",
      "targets": [{
        "expr": "100 * sum(rate(dapr_http_server_request_count{status_code=~\"5..\"}[5m])) by (app_id) / sum(rate(dapr_http_server_request_count[5m])) by (app_id)",
        "legendFormat": "{{app_id}} error %"
      }]
    },
    {
      "title": "P99 Latency (ms)",
      "type": "graph",
      "targets": [{
        "expr": "histogram_quantile(0.99, sum(rate(dapr_http_server_latency_bucket[5m])) by (app_id, le))",
        "legendFormat": "{{app_id}} p99"
      }]
    },
    {
      "title": "Pub/Sub Message Throughput",
      "type": "graph",
      "targets": [{
        "expr": "sum(rate(dapr_component_pubsub_ingress_count[5m])) by (app_id, topic)",
        "legendFormat": "{{app_id}}/{{topic}}"
      }]
    }
  ]
}
```

## Import Official Dapr Grafana Dashboards

```bash
# Dapr provides official Grafana dashboards
# Download from the Dapr GitHub repository
curl -O https://raw.githubusercontent.com/dapr/dapr/master/grafana/grafana-sidecar-dashboard.json
curl -O https://raw.githubusercontent.com/dapr/dapr/master/grafana/grafana-system-services-dashboard.json

# Import via Grafana API
curl -X POST http://grafana:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-grafana-api-key>" \
  -d "{\"dashboard\": $(cat grafana-sidecar-dashboard.json), \"overwrite\": true}"
```

## Summary

A comprehensive Dapr monitoring dashboard combines Prometheus metrics scraped from sidecar `/metrics` endpoints with Grafana visualizations covering request rate, error rate, latency percentiles, and pub/sub throughput. Enable metrics via the Configuration resource, use PodMonitors for automatic discovery, and import Dapr's official Grafana dashboards as a starting point.
