# How to Set Up Traffic Volume Monitoring in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Monitoring, Traffic Volume, Prometheus, Observability

Description: Monitor request volume and throughput across your Istio service mesh using Prometheus metrics for capacity planning, anomaly detection, and cost allocation.

---

Understanding how much traffic each service handles is fundamental to running a reliable system. Traffic volume monitoring tells you whether your services are properly scaled, helps you plan capacity, catches traffic anomalies early, and even helps with cost allocation in multi-tenant environments. Istio tracks every single request through its sidecar proxies, making traffic volume metrics available for free.

## The Core Metric

`istio_requests_total` is the counter that tracks every request. It increments by one for each request processed. Combined with Prometheus's `rate()` function, it gives you requests per second (RPS) for any service in your mesh.

## Basic Traffic Volume Queries

### Requests Per Second (RPS) by Service

```promql
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
```

This shows the incoming request rate for every service in the mesh. Using `reporter="destination"` counts requests at the receiving end, which is the standard way to measure a service's load.

### Total Request Count Over a Period

```promql
sum(increase(istio_requests_total{reporter="destination"}[24h])) by (destination_service_name)
```

`increase()` gives you the total number of requests over the specified period. This is useful for daily and weekly reports.

### RPS for a Specific Service

```promql
sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service"}[5m]))
```

### Traffic Volume by Source

See which services are generating the most traffic to a specific destination:

```promql
sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service"}[5m])) by (source_workload)
```

## Setting Up Prometheus

If you do not have Prometheus yet:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
```

Verify it is scraping Istio metrics:

```bash
istioctl dashboard prometheus
```

Query for `istio_requests_total` in the Prometheus UI to confirm data is flowing.

## Byte-Level Traffic Volume

Beyond request counts, you might want to know how many bytes are flowing. Istio provides these metrics:

```promql
# Request bytes per second (incoming payload)
sum(rate(istio_request_bytes_sum{reporter="destination"}[5m])) by (destination_service_name)

# Response bytes per second (outgoing payload)
sum(rate(istio_response_bytes_sum{reporter="destination"}[5m])) by (destination_service_name)
```

To see this in human-readable units in Grafana, divide by 1024 for KB/s or 1048576 for MB/s:

```promql
sum(rate(istio_response_bytes_sum{reporter="destination"}[5m])) by (destination_service_name) / 1048576
```

## Traffic Volume by HTTP Method

Break down traffic by HTTP method to understand the read/write ratio:

```promql
sum(rate(istio_requests_total{reporter="destination", destination_service_name="my-api"}[5m])) by (request_protocol, response_code)
```

For method-level breakdown, you might need to enable the request method as a metric label if it is not enabled by default in your version:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: method-metrics
  namespace: default
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            request_method:
              value: "request.method"
```

Then query:

```promql
sum(rate(istio_requests_total{reporter="destination", destination_service_name="my-api"}[5m])) by (request_method)
```

## Grafana Dashboard for Traffic Volume

### Panel 1: Service Traffic Overview

```promql
sort_desc(
  sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
)
```

Display as a bar chart, sorted by highest traffic. This gives you an instant view of which services are busiest.

### Panel 2: Traffic Trend Over Time

```promql
sum(rate(istio_requests_total{reporter="destination", destination_service_name="$service"}[5m]))
```

Use a Grafana variable for `$service`. Display as a time series over 24 hours or 7 days to see patterns (peak hours, weekday vs. weekend, etc.).

### Panel 3: Top Callers

```promql
topk(10,
  sum(rate(istio_requests_total{reporter="destination"}[5m])) by (source_workload, destination_service_name)
)
```

Shows the top 10 service-to-service communication paths by volume.

### Panel 4: Traffic Growth Comparison

Compare this week's traffic to last week:

```promql
# This week
sum(rate(istio_requests_total{reporter="destination", destination_service_name="$service"}[5m]))

# Last week (offset)
sum(rate(istio_requests_total{reporter="destination", destination_service_name="$service"}[5m] offset 7d))
```

Plot both on the same graph to see growth trends.

## Capacity Planning

Use traffic volume data for capacity planning:

### Peak-to-Average Ratio

```promql
max_over_time(
  sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service"}[5m]))[24h:5m]
)
/
avg_over_time(
  sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service"}[5m]))[24h:5m]
)
```

A ratio of 3 means peak traffic is 3x the average. You need your service scaled to handle at least the peak, with headroom for unexpected spikes.

### Traffic Growth Rate

Week-over-week growth:

```promql
(
  sum(increase(istio_requests_total{reporter="destination", destination_service_name="payment-service"}[7d]))
  -
  sum(increase(istio_requests_total{reporter="destination", destination_service_name="payment-service"}[7d] offset 7d))
)
/
sum(increase(istio_requests_total{reporter="destination", destination_service_name="payment-service"}[7d] offset 7d))
* 100
```

This tells you the percentage change in traffic volume week over week.

## Anomaly Detection

Alert on unusual traffic patterns:

### Traffic Spike Alert

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: traffic-volume-alerts
  namespace: monitoring
spec:
  groups:
    - name: istio-traffic-volume
      rules:
        - alert: TrafficSpike
          expr: |
            sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
            >
            3 * sum(rate(istio_requests_total{reporter="destination"}[1h])) by (destination_service_name)
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Traffic spike on {{ $labels.destination_service_name }}"
            description: "Current traffic is 3x the hourly average"
        - alert: TrafficDrop
          expr: |
            sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
            <
            0.1 * sum(rate(istio_requests_total{reporter="destination"}[1h])) by (destination_service_name)
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Sudden traffic drop on {{ $labels.destination_service_name }}"
            description: "Traffic dropped to less than 10% of the hourly average"
```

Traffic drops can be as concerning as spikes. If a service suddenly stops receiving traffic, there might be a routing issue or an upstream failure.

### Zero-Traffic Alert

```yaml
- alert: NoTraffic
  expr: |
    absent(rate(istio_requests_total{reporter="destination", destination_service_name="critical-service"}[5m]) > 0)
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "No traffic reaching critical-service"
```

## Inter-Service Traffic Map

Build a complete traffic map of your mesh:

```promql
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (source_workload, destination_service_name)
```

This gives you every edge in your service communication graph with its traffic volume. Visualize it in Kiali for a graphical view:

```bash
istioctl dashboard kiali
```

Kiali automatically shows traffic volume on each edge in the service graph.

## Per-Namespace Traffic

For multi-tenant clusters, track traffic per namespace:

```promql
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_namespace)
```

This is useful for cost allocation if different teams or tenants own different namespaces.

## Checking Raw Metrics

If something seems off, check the metrics directly on the sidecar:

```bash
# Raw request count metrics
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15090/stats/prometheus | grep istio_requests_total

# Proxy stats summary
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/stats | grep "downstream_rq"
```

## Summary

Traffic volume monitoring in Istio gives you visibility into how much load each service handles, where that traffic comes from, and how patterns change over time. Use these metrics for capacity planning, anomaly detection, and understanding your service communication patterns. The combination of request rate, byte rate, and source/destination breakdowns provides a complete picture of your mesh traffic. Set up alerts for both spikes and drops, and use week-over-week comparisons to track growth trends.
