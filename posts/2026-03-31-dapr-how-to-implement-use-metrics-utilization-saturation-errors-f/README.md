# How to Implement USE Metrics (Utilization, Saturation, Errors) for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Observability, Prometheus, USE Method, Metric, SRE, Monitoring

Description: Learn how to apply the USE method to Dapr microservices by identifying and alerting on Utilization, Saturation, and Error metrics for Dapr sidecars and components.

---

The USE Method (Utilization, Saturation, Errors) by Brendan Gregg provides a systematic way to diagnose performance problems in any system: for every resource, measure how busy it is (utilization), how much work is waiting (saturation), and how often it fails (errors). Applying this framework to Dapr gives you a structured set of Prometheus metrics and alerts that surface bottlenecks before users notice them.

## The USE Method Applied to Dapr

Dapr exposes hundreds of Prometheus metrics. The USE framework narrows focus to the metrics that matter:

```text
Resource             Utilization           Saturation              Errors
-----------          -----------           ----------              ------
Sidecar HTTP         req/s vs capacity     request queue depth     HTTP 4xx/5xx rate
Service Invocation   active connections    pending calls           invocation failures
State Store          ops/s vs capacity     pending ops             state errors
Pub/Sub              msg throughput        pending messages        delivery failures
Actors               activated actors      pending method calls    actor errors
gRPC                 concurrent streams    stream backlog          gRPC status errors
```

## Scraping Dapr Metrics with Prometheus

Dapr sidecars expose metrics on port 9090 (HTTP) by default:

```yaml
# prometheus-config.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dapr-sidecar-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      dapr.io/enabled: "true"
  endpoints:
  - port: dapr-metrics
    path: /metrics
    interval: 15s
---
# Annotate pods to expose Dapr metrics port
# In your Deployment spec:
# annotations:
#   dapr.io/enabled: "true"
#   dapr.io/metrics-port: "9090"
```

Enable metrics in Dapr configuration:

```yaml
# components/config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  metrics:
    enabled: true
    rules:
    - labels:
      - name: method
        regex: ""
```

## Utilization Metrics and Queries

Utilization measures how busy a resource is relative to its capacity.

**Service Invocation Utilization:**

```promql
# Request rate per service (calls/second)
sum(rate(dapr_http_server_request_count{app_id="order-service"}[5m])) by (method, path)

# gRPC server utilization
sum(rate(dapr_grpc_io_server_completed_rpcs[5m])) by (grpc_server_method)

# Outbound service invocation rate
rate(dapr_runtime_service_invocation_req_sent_total[5m])
```

**State Store Utilization:**

```promql
# State store operations per second
sum(rate(dapr_component_state_count[5m])) by (component, operation)

# Component operation throughput
sum(rate(dapr_component_state_count{success="true"}[5m]))
```

**Pub/Sub Utilization:**

```promql
# Messages published per second
rate(dapr_component_pubsub_egress_count[5m])

# Messages ingressed (consumed) per second
rate(dapr_component_pubsub_ingress_count[5m])
```

## Saturation Metrics and Queries

Saturation measures the queue depth or backlog - work that is waiting.

**Active Actor Call Queue:**

```promql
# Pending actor method calls (high = saturation)
dapr_runtime_actor_pending_actor_calls{actor_type="OrderActor"}

# Activated actors count
dapr_runtime_actor_activated_total
```

**HTTP Request Queue:**

```promql
# HTTP request rate to the sidecar
rate(dapr_http_server_request_count{app_id="order-service"}[5m])

# P99 latency spike indicates saturation
histogram_quantile(0.99, 
  rate(dapr_http_server_latency_bucket[5m])
) > 1000
```

**Pub/Sub Lag:**

```promql
# For Redis Streams backend - use Redis metrics
redis_stream_length{stream="pubsub"}

# Messages pending (not yet ACKed) 
dapr_component_pubsub_ingress_latencies_bucket
```

## Errors Metrics and Queries

Errors measure failure rates for each resource.

**Service Invocation Errors:**

```promql
# HTTP error rate
sum(rate(dapr_http_server_request_count{status=~"5.."}[5m])) by (app_id) /
sum(rate(dapr_http_server_request_count[5m])) by (app_id)

# Service invocation failures
rate(dapr_runtime_service_invocation_req_sent_total{status="failed"}[5m])
```

**State Store Errors:**

```promql
# State store failure rate
sum(rate(dapr_component_state_count{success="false"}[5m])) by (component) /
sum(rate(dapr_component_state_count[5m])) by (component)
```

**Pub/Sub Errors:**

```promql
# Failed message deliveries
rate(dapr_component_pubsub_ingress_count{success="false"}[5m])
rate(dapr_component_pubsub_egress_count{success="false"}[5m])
```

## Prometheus Alerting Rules

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-use-alerts
  namespace: monitoring
spec:
  groups:
  - name: dapr-utilization
    interval: 30s
    rules:
    - alert: DaprHighRequestRate
      expr: |
        sum(rate(dapr_http_server_request_count[5m])) by (app_id) > 1000
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "App {{ $labels.app_id }} receiving > 1000 req/s"

  - name: dapr-saturation
    interval: 30s
    rules:
    - alert: DaprActorQueueSaturated
      expr: dapr_runtime_actor_pending_actor_calls > 100
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Actor queue > 100 pending calls for {{ $labels.actor_type }}"

    - alert: DaprHighP99Latency
      expr: |
        histogram_quantile(0.99,
          rate(dapr_http_server_latency_bucket[5m])
        ) > 2000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Dapr sidecar p99 latency > 2000ms for {{ $labels.app_id }}"

  - name: dapr-errors
    interval: 30s
    rules:
    - alert: DaprHighErrorRate
      expr: |
        (
          sum(rate(dapr_http_server_request_count{status=~"5.."}[5m])) by (app_id) /
          sum(rate(dapr_http_server_request_count[5m])) by (app_id)
        ) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Error rate > 5% for {{ $labels.app_id }}"

    - alert: DaprStateStoreErrors
      expr: |
        sum(rate(dapr_component_state_count{success="false"}[5m])) by (component) > 0.5
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "State store {{ $labels.component }} failing > 0.5/s"

    - alert: DaprPubSubDeliveryFailures
      expr: rate(dapr_component_pubsub_ingress_count{success="false"}[5m]) > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Pub/sub delivery failures > 0.1/s"
```

## Grafana Dashboard Setup

```bash
# Install Grafana via Helm
helm repo add grafana https://grafana.github.io/helm-charts
helm install grafana grafana/grafana --namespace monitoring

# Download the official Dapr Grafana dashboards from the Dapr repo
# https://github.com/dapr/dapr/tree/master/grafana
# Available dashboards:
#   grafana-system-services-dashboard.json
#   grafana-sidecar-dashboard.json
#   grafana-actor-dashboard.json

# Apply via configmap
kubectl create configmap dapr-dashboard \
  --from-file=grafana-sidecar-dashboard.json \
  --namespace monitoring
```

Key panels to include in your USE dashboard:

```text
Row 1 - Utilization:
  - Request rate by app (line chart)
  - State ops/s by component (bar chart)
  - Pub/sub throughput (line chart)

Row 2 - Saturation:
  - P50/P95/P99 latency (multi-line)
  - Pending actor calls (gauge)
  - HTTP concurrent requests (gauge)

Row 3 - Errors:
  - Error rate by app (line chart)
  - State store failures (stat panel)
  - Pub/sub delivery failures (stat panel)
```

## Summary

Applying the USE method to Dapr metrics gives you a structured monitoring strategy covering Utilization (throughput rates), Saturation (queue depths and latency spikes), and Errors (failure rates per component). The most critical metrics are p99 latency for saturation detection, error rate for reliability SLO tracking, and pub/sub pending message count for consumer lag alerting. Configure PrometheusRule resources for automated alerting and import the official Dapr Grafana dashboards from the Dapr GitHub repository as a starting point for building a comprehensive USE dashboard for your Dapr deployment.
