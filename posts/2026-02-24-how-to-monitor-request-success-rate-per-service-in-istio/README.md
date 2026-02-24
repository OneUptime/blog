# How to Monitor Request Success Rate per Service in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Monitoring, Success Rate, Prometheus, Observability

Description: Track and monitor request success rates per service in Istio using Prometheus queries, Grafana dashboards, and alerting for SLO enforcement.

---

Success rate is arguably the single most important metric for any service. If your success rate drops, your users are having a bad time. Istio automatically tracks every request through the sidecar proxies, which means you get per-service success rate metrics without adding any instrumentation to your application code.

## What Counts as Success?

In HTTP-land, success generally means a 2xx or 3xx response code. A 4xx might be a client error (which is not necessarily your service's fault), and a 5xx is definitely a server error. The definition of "success" for your alerting should depend on your context:

- **Strict success rate:** Only 2xx responses count as success
- **Lenient success rate:** 2xx and 3xx count as success, 4xx are excluded from the calculation
- **Error-focused:** Only track the 5xx rate (server errors)

## The Base Metric

Istio reports `istio_requests_total`, a counter that increments for every request. It includes labels for:

- `response_code` - The HTTP status code (200, 404, 503, etc.)
- `source_workload` - The calling service
- `destination_service_name` - The receiving service
- `destination_workload` - The specific destination deployment
- `reporter` - "source" (client-side) or "destination" (server-side)
- `request_protocol` - HTTP or gRPC

## Basic Success Rate Query

The success rate over the last 5 minutes for all services:

```promql
sum(rate(istio_requests_total{reporter="destination", response_code=~"2.."}[5m])) by (destination_service_name)
/
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
* 100
```

This gives you a percentage. A value of 99.5 means 99.5% of requests returned a 2xx status code.

## Success Rate Excluding Client Errors

If you do not want 4xx errors dragging down your success rate (since they are often the client's fault):

```promql
(
  sum(rate(istio_requests_total{reporter="destination", response_code!~"5.."}[5m])) by (destination_service_name)
  /
  sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
) * 100
```

This counts everything except 5xx as success.

## Per-Service Success Rate

Focus on a specific service:

```promql
(
  sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service", response_code=~"2.."}[5m]))
  /
  sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service"}[5m]))
) * 100
```

## Success Rate by Source

See which callers are experiencing the lowest success rates with your service:

```promql
(
  sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service", response_code=~"2.."}[5m])) by (source_workload)
  /
  sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service"}[5m])) by (source_workload)
) * 100
```

If one caller has a significantly lower success rate than others, the issue might be in how that caller is making requests (bad parameters, timeout settings, etc.) rather than in the service itself.

## Success Rate by Endpoint

Break down by request path to find which endpoints are failing:

```promql
(
  sum(rate(istio_requests_total{reporter="destination", destination_service_name="my-api", response_code=~"2.."}[5m])) by (destination_service_name)
  /
  sum(rate(istio_requests_total{reporter="destination", destination_service_name="my-api"}[5m])) by (destination_service_name)
) * 100
```

Note: By default, Istio does not include request path as a metric label because it would cause high cardinality. To enable it, you need to configure metric tag overrides (see the customization section below).

## gRPC Success Rate

For gRPC services, use the `grpc_response_status` label:

```promql
(
  sum(rate(istio_requests_total{reporter="destination", destination_service_name="grpc-service", grpc_response_status="0"}[5m]))
  /
  sum(rate(istio_requests_total{reporter="destination", destination_service_name="grpc-service"}[5m]))
) * 100
```

gRPC status code 0 means OK.

## Setting Up Grafana Dashboard

Create a Grafana dashboard with a success rate panel:

### Panel 1: Overall Service Success Rate

```promql
(
  sum(rate(istio_requests_total{reporter="destination", response_code!~"5.."}[5m])) by (destination_service_name)
  /
  sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
) * 100
```

Set the Y-axis minimum to 95 and maximum to 100 (since you generally want to see the difference between 99% and 99.9%).

### Panel 2: Success Rate Trend (24h)

Use the same query but change the range to `[24h]` and set the graph resolution to 5 minutes. This shows how the success rate has trended over the day.

### Panel 3: Error Rate by Response Code

```promql
sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_service_name, response_code)
```

This shows the breakdown of error types (500, 502, 503, 504) per service.

## Alerting on Success Rate

Set up Prometheus alerts for SLO violations:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: service-success-rate
  namespace: monitoring
spec:
  groups:
    - name: istio-success-rate
      rules:
        - alert: LowSuccessRate
          expr: |
            (
              sum(rate(istio_requests_total{reporter="destination", response_code!~"5.."}[5m])) by (destination_service_name)
              /
              sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
            ) * 100 < 99.5
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Success rate below 99.5% for {{ $labels.destination_service_name }}"
            description: "Current success rate is {{ $value | humanize }}%"
        - alert: CriticalSuccessRate
          expr: |
            (
              sum(rate(istio_requests_total{reporter="destination", response_code!~"5.."}[5m])) by (destination_service_name)
              /
              sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
            ) * 100 < 95
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Critical success rate for {{ $labels.destination_service_name }}"
            description: "Success rate dropped to {{ $value | humanize }}%"
```

## SLO-Based Monitoring

If your SLO is 99.9% success rate over a 30-day window, track the error budget:

```promql
# Error budget remaining (as a percentage)
1 - (
  (1 - (
    sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service", response_code!~"5.."}[30d]))
    /
    sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service"}[30d]))
  ))
  /
  0.001  # 0.1% error budget for 99.9% SLO
)
```

A value of 0.5 means 50% of the error budget remains. When it reaches 0, you have exhausted your SLO budget for the month.

## Customizing Metrics Labels

To add request path to your metrics (for per-endpoint success rates), use the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-metrics
  namespace: default
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: CLIENT_AND_SERVER
          tagOverrides:
            request_path:
              value: "request.url_path"
```

Be cautious with this. High-cardinality labels (like request paths with dynamic segments) can cause Prometheus storage and performance issues.

## Minimum Traffic Threshold

Do not alert on low-traffic services. A service that handles 1 request per minute can swing from 0% to 100% success rate with a single error:

```promql
(
  sum(rate(istio_requests_total{reporter="destination", response_code!~"5.."}[5m])) by (destination_service_name)
  /
  sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
) * 100 < 99.5
and
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name) > 1
```

The `> 1` filter ensures you only alert on services handling more than 1 request per second.

## Checking Metrics from the Sidecar

If Prometheus is not showing data, check the sidecar directly:

```bash
# Check raw metrics
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15090/stats/prometheus | grep istio_requests_total

# Check the merged metrics endpoint
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15020/stats/prometheus | grep istio_requests_total
```

## Summary

Monitoring success rate per service in Istio is straightforward because every request is automatically tracked. Use Prometheus to calculate success rate percentages, Grafana to visualize trends, and alerting rules to catch SLO violations. Break down by source, response code, and destination to quickly identify where failures are happening. Remember to exclude low-traffic services from alerting to avoid noisy false positives, and consider whether 4xx responses should count against your success rate based on your specific use case.
