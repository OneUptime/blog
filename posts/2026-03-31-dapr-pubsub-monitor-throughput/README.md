# How to Monitor Pub/Sub Message Throughput in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Monitoring, Throughput, Prometheus, Observability, Metric

Description: Learn how to monitor pub/sub message throughput in Dapr using Prometheus metrics and Grafana dashboards to track publish and subscribe rates.

---

## Why Monitor Pub/Sub Throughput

Tracking message throughput in a Dapr pub/sub system helps you identify bottlenecks, plan capacity, and detect processing slowdowns before they cause service degradation. Dapr exposes built-in Prometheus metrics for pub/sub operations that you can scrape and visualize without any additional instrumentation.

## Enabling Dapr Metrics

By default, Dapr exposes metrics on port `9090`. Ensure your Dapr sidecar has metrics enabled in its configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprconfig
  namespace: default
spec:
  metrics:
    enabled: true
```

Apply this configuration and reference it in your deployment annotation. The metrics port defaults to `9090` and can be changed with the `dapr.io/metrics-port` annotation:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/config: "daprconfig"
  dapr.io/metrics-port: "9090"
```

## Key Pub/Sub Throughput Metrics

Dapr exposes the following relevant metrics for pub/sub throughput:

| Metric | Description |
|--------|-------------|
| `dapr_component_pubsub_egress_count` | Number of messages published |
| `dapr_component_pubsub_ingress_count` | Number of messages received by subscribers |
| `dapr_component_pubsub_egress_latencies` | Publish latency histogram |
| `dapr_component_pubsub_ingress_latencies` | Subscribe processing latency histogram |

Query publish rate per second in Prometheus:

```promql
rate(dapr_component_pubsub_egress_count[1m])
```

Query subscribe ingress rate:

```promql
rate(dapr_component_pubsub_ingress_count[1m])
```

Filter by component name and topic:

```promql
rate(dapr_component_pubsub_egress_count{component="kafka-pubsub",topic="orders"}[1m])
```

## Setting Up Prometheus Scraping

Create a `ServiceMonitor` for Prometheus Operator to scrape Dapr sidecar metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dapr-sidecar-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: order-service
  endpoints:
    - port: dapr-metrics
      path: /metrics
      interval: 15s
```

Expose the metrics port in your service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  ports:
    - name: dapr-metrics
      port: 9090
      targetPort: 9090
```

## Building a Grafana Dashboard

Use the following Grafana panel queries to visualize throughput:

**Publish Rate:**
```promql
sum by (app_id, topic) (
  rate(dapr_component_pubsub_egress_count[5m])
)
```

**Subscribe Rate:**
```promql
sum by (app_id, topic) (
  rate(dapr_component_pubsub_ingress_count[5m])
)
```

**P95 Publish Latency (ms):**
```promql
histogram_quantile(0.95,
  rate(dapr_component_pubsub_egress_latencies_bucket[5m])
)
```

## Alerting on Low Throughput

Create an alert rule to detect when throughput drops below expected levels:

```yaml
groups:
  - name: dapr-pubsub-alerts
    rules:
      - alert: LowPubSubThroughput
        expr: |
          rate(dapr_component_pubsub_ingress_count{topic="orders"}[5m]) < 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Dapr pub/sub throughput is below threshold"
          description: "Topic {{ $labels.topic }} ingress rate is {{ $value }} msg/s"
```

## Monitoring from the Dapr Dashboard

The Dapr dashboard provides a basic real-time view of component activity. Run it locally:

```bash
dapr dashboard
```

Open `http://localhost:8080` to view active components and their configuration. For production-grade throughput monitoring, combine the dashboard with Prometheus and Grafana.

## Summary

Dapr exposes Prometheus metrics for pub/sub egress and ingress counts and latencies. By scraping these metrics with Prometheus and building Grafana dashboards, you can track message throughput per topic and app, set alerts on drop conditions, and correlate publish and subscribe rates to find processing bottlenecks in your event-driven system.
