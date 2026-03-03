# How to Set Up Prometheus Recording Rules for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Prometheus, Recording Rules, Monitoring, Performance

Description: Create Prometheus recording rules for Istio to pre-compute expensive queries and speed up dashboard loading for large service meshes.

---

If your Grafana dashboards for Istio take forever to load, or your Prometheus queries time out, you probably need recording rules. Recording rules pre-compute frequently used or computationally expensive PromQL expressions and save the results as new time series. Instead of calculating the error rate across 500 pods every time someone opens a dashboard, Prometheus calculates it once per evaluation interval and stores the result.

## Why Recording Rules Matter for Istio

Istio generates a lot of metrics. Every sidecar proxy reports metrics for every connection, and in a mesh with hundreds of services, the cardinality explodes. Queries that aggregate across many time series (like "error rate for all services in the mesh") get slow fast.

Recording rules solve this by:
- Pre-computing expensive aggregations
- Reducing dashboard load times from seconds to milliseconds
- Enabling alert rules to use simpler, faster queries
- Reducing the load on Prometheus itself

## Setting Up Recording Rules

Recording rules are defined in Prometheus configuration. With a Kubernetes-based Prometheus, you typically use a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: istio-system
data:
  istio-recording-rules.yml: |
    groups:
      - name: istio-request-rates
        interval: 30s
        rules:
          - record: istio:request_rate:by_service
            expr: |
              sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)

          - record: istio:error_rate:by_service
            expr: |
              sum(rate(istio_requests_total{reporter="destination", response_code=~"5.*"}[5m])) by (destination_service)

          - record: istio:success_rate:by_service
            expr: |
              (
                sum(rate(istio_requests_total{reporter="destination", response_code!~"5.*"}[5m])) by (destination_service)
                /
                sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)
              ) * 100
```

The `interval: 30s` means these rules are evaluated every 30 seconds. The resulting time series have the name specified in the `record` field.

## Request Rate Recording Rules

These are the most commonly needed rules for Istio:

```yaml
  istio-rates.yml: |
    groups:
      - name: istio-rates
        interval: 30s
        rules:
          # Global mesh request rate
          - record: istio:mesh:request_rate:total
            expr: sum(rate(istio_requests_total{reporter="source"}[5m]))

          # Request rate per service
          - record: istio:service:request_rate:5m
            expr: |
              sum(rate(istio_requests_total{reporter="destination"}[5m])) by (
                destination_service,
                destination_workload_namespace
              )

          # Request rate per workload
          - record: istio:workload:request_rate:5m
            expr: |
              sum(rate(istio_requests_total{reporter="destination"}[5m])) by (
                destination_workload,
                destination_workload_namespace,
                destination_version
              )

          # Request rate per source-destination pair
          - record: istio:service_pair:request_rate:5m
            expr: |
              sum(rate(istio_requests_total{reporter="source"}[5m])) by (
                source_workload,
                source_workload_namespace,
                destination_service
              )

          # Request rate by response code
          - record: istio:service:request_rate:by_code:5m
            expr: |
              sum(rate(istio_requests_total{reporter="destination"}[5m])) by (
                destination_service,
                response_code
              )
```

## Latency Recording Rules

Latency aggregations are especially expensive because they involve histogram buckets:

```yaml
  istio-latency.yml: |
    groups:
      - name: istio-latency
        interval: 30s
        rules:
          # P50 latency per service
          - record: istio:service:latency:p50:5m
            expr: |
              histogram_quantile(0.50,
                sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (
                  le, destination_service
                )
              )

          # P95 latency per service
          - record: istio:service:latency:p95:5m
            expr: |
              histogram_quantile(0.95,
                sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (
                  le, destination_service
                )
              )

          # P99 latency per service
          - record: istio:service:latency:p99:5m
            expr: |
              histogram_quantile(0.99,
                sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (
                  le, destination_service
                )
              )

          # Pre-aggregated histogram buckets per service (for custom quantile calculation)
          - record: istio:service:duration_bucket:rate:5m
            expr: |
              sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (
                le, destination_service
              )
```

The pre-aggregated histogram bucket rule is useful when you want to calculate arbitrary quantiles in your dashboards without the full aggregation cost.

## Error Rate Recording Rules

```yaml
  istio-errors.yml: |
    groups:
      - name: istio-errors
        interval: 30s
        rules:
          # 5xx error rate per service (percentage)
          - record: istio:service:error_rate_5xx:5m
            expr: |
              (
                sum(rate(istio_requests_total{reporter="destination", response_code=~"5.*"}[5m])) by (destination_service)
                /
                sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)
              ) * 100

          # 4xx error rate per service
          - record: istio:service:error_rate_4xx:5m
            expr: |
              (
                sum(rate(istio_requests_total{reporter="destination", response_code=~"4.*"}[5m])) by (destination_service)
                /
                sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)
              ) * 100

          # Error rate per workload
          - record: istio:workload:error_rate_5xx:5m
            expr: |
              (
                sum(rate(istio_requests_total{reporter="destination", response_code=~"5.*"}[5m])) by (destination_workload, destination_workload_namespace)
                /
                sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_workload, destination_workload_namespace)
              ) * 100
```

## Control Plane Recording Rules

Pre-compute control plane metrics:

```yaml
  istio-control-plane.yml: |
    groups:
      - name: istio-control-plane-records
        interval: 30s
        rules:
          - record: istio:pilot:push_convergence:p99:5m
            expr: |
              histogram_quantile(0.99,
                sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le)
              )

          - record: istio:pilot:xds_push_rate:5m
            expr: sum(rate(pilot_xds_pushes[5m])) by (type)

          - record: istio:pilot:xds_push_error_rate:5m
            expr: sum(rate(pilot_xds_push_errors[5m])) by (type)
```

## Using Recording Rules in Dashboards

Now update your Grafana dashboards to use the recorded metrics instead of raw queries:

```promql
# Before (slow):
sum(rate(istio_requests_total{reporter="destination", response_code=~"5.*"}[5m])) by (destination_service)
/
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)
* 100

# After (fast):
istio:service:error_rate_5xx:5m
```

The dashboard query becomes a simple metric lookup instead of an aggregation across thousands of time series.

## Using Recording Rules in Alerts

Alert rules also benefit from recording rules:

```yaml
groups:
  - name: istio-alerts-using-records
    rules:
      - alert: HighErrorRate
        expr: istio:service:error_rate_5xx:5m > 5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate for {{ $labels.destination_service }}"

      - alert: HighLatency
        expr: istio:service:latency:p99:5m > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High P99 latency for {{ $labels.destination_service }}"
```

These alert rules are much cheaper to evaluate because they're working with pre-computed data.

## Naming Conventions

Follow a consistent naming pattern for your recording rules. The standard convention is:

```text
level:metric:operations
```

For example:
- `istio:service:request_rate:5m` - service-level, request rate, 5-minute window
- `istio:workload:error_rate_5xx:5m` - workload-level, 5xx error rate, 5-minute window
- `istio:mesh:request_rate:total` - mesh-level, total request rate

This makes it easy to discover and understand recording rules.

## Verifying Recording Rules

Check that your rules are loaded and evaluating correctly:

```bash
# Port-forward to Prometheus
kubectl port-forward -n istio-system svc/prometheus 9090:9090

# Check rules status at http://localhost:9090/rules
# Check the recorded metrics at http://localhost:9090/graph
```

Query your recorded metrics to make sure they're producing expected values:

```bash
# Use the Prometheus API
curl -s 'http://localhost:9090/api/v1/query?query=istio:service:request_rate:5m' | python3 -m json.tool
```

## Summary

Prometheus recording rules for Istio pre-compute expensive aggregations and store them as new time series. Focus on recording rules for request rates, error rates, and latency percentiles at the service and workload levels. Use a consistent naming convention, evaluate rules every 30 seconds, and update your dashboards and alerts to reference the recorded metrics instead of raw queries. This significantly improves dashboard performance and reduces Prometheus resource usage in large meshes.
