# How to Monitor Request Success Rate with Istio Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Metrics, Monitoring, Success Rate, Prometheus, SRE

Description: How to calculate and monitor request success rates across your Istio service mesh using Prometheus queries and alerting rules.

---

Request success rate is probably the single most important metric you can track in a service mesh. It tells you what percentage of requests are completing successfully, and when that number drops, you know something is wrong. Istio makes tracking this straightforward because every request flowing through the mesh gets recorded by Envoy sidecars, regardless of whether the application itself instruments anything.

## What Counts as "Successful"

Before you set up monitoring, you need to define what "successful" means for your services. The most common definition is: any response that is not a 5xx error. This means:

- 2xx (success) - counts as good
- 3xx (redirects) - counts as good
- 4xx (client errors) - usually counts as good (the server did its job, the client sent a bad request)
- 5xx (server errors) - counts as bad

Some teams exclude specific codes. For example, you might not count 429 (too many requests) as a failure because rate limiting is intentional behavior. The key is to be consistent in your definition.

## The Core Metric: istio_requests_total

Istio's `istio_requests_total` counter tracks every request through the mesh. It has these labels:

- `source_workload` - The workload that sent the request
- `destination_workload` - The workload that received the request
- `destination_service` - The Kubernetes service name (FQDN format)
- `response_code` - The HTTP response status code
- `request_protocol` - HTTP or gRPC
- `response_flags` - Envoy response flags (important for debugging)

## Calculating Success Rate

The basic success rate formula:

```promql
# Success rate for a specific service (last 5 minutes)
sum(rate(istio_requests_total{
  destination_service="my-service.default.svc.cluster.local",
  response_code!~"5.."
}[5m]))
/
sum(rate(istio_requests_total{
  destination_service="my-service.default.svc.cluster.local"
}[5m]))
```

This gives you a ratio between 0 and 1. Multiply by 100 if you want a percentage.

### Success Rate by Service (Across the Mesh)

```promql
sum(rate(istio_requests_total{response_code!~"5.."}[5m])) by (destination_service)
/
sum(rate(istio_requests_total[5m])) by (destination_service)
```

### Success Rate by Source-Destination Pair

```promql
sum(rate(istio_requests_total{response_code!~"5.."}[5m])) by (source_workload, destination_workload)
/
sum(rate(istio_requests_total[5m])) by (source_workload, destination_workload)
```

This is useful when a service's success rate drops and you want to know if it is being caused by a specific caller.

### Success Rate for gRPC Services

gRPC services return HTTP 200 even when the gRPC status is an error. You need to use the `grpc_response_status` label instead:

```promql
sum(rate(istio_requests_total{
  destination_service="my-grpc-service.default.svc.cluster.local",
  grpc_response_status="0"
}[5m]))
/
sum(rate(istio_requests_total{
  destination_service="my-grpc-service.default.svc.cluster.local",
  request_protocol="grpc"
}[5m]))
```

gRPC status code 0 means OK. Any other code indicates an error.

## Recording Rules for Efficiency

If you are computing success rates for dashboards and alerts, create recording rules so Prometheus does not recompute the same thing every time:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-success-rate-rules
  namespace: monitoring
spec:
  groups:
    - name: istio-success-rate
      interval: 30s
      rules:
        - record: istio:success_rate_5m
          expr: |
            sum(rate(istio_requests_total{response_code!~"5.."}[5m])) by (destination_service)
            /
            sum(rate(istio_requests_total[5m])) by (destination_service)

        - record: istio:success_rate_1h
          expr: |
            sum(rate(istio_requests_total{response_code!~"5.."}[1h])) by (destination_service)
            /
            sum(rate(istio_requests_total[1h])) by (destination_service)

        - record: istio:success_rate_by_pair_5m
          expr: |
            sum(rate(istio_requests_total{response_code!~"5.."}[5m])) by (source_workload, destination_service)
            /
            sum(rate(istio_requests_total[5m])) by (source_workload, destination_service)
```

## Setting Up Alerts

### Basic Success Rate Alert

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-success-rate-alerts
  namespace: monitoring
spec:
  groups:
    - name: istio-success-rate-alerts
      rules:
        - alert: IstioServiceLowSuccessRate
          expr: |
            istio:success_rate_5m < 0.99
            and
            sum(rate(istio_requests_total[5m])) by (destination_service) > 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Low success rate for {{ $labels.destination_service }}"
            description: "Service {{ $labels.destination_service }} has a success rate of {{ $value | humanizePercentage }} over the last 5 minutes."

        - alert: IstioServiceCriticalSuccessRate
          expr: |
            istio:success_rate_5m < 0.95
            and
            sum(rate(istio_requests_total[5m])) by (destination_service) > 1
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Critical success rate for {{ $labels.destination_service }}"
            description: "Service {{ $labels.destination_service }} has a success rate of {{ $value | humanizePercentage }} over the last 5 minutes."
```

The `and sum(rate(...)) > 1` clause prevents alerts from firing on services with very low traffic, where a single failed request would cause the success rate to plummet.

### Success Rate Drop Alert

Sometimes the absolute success rate is fine, but there is a sudden drop compared to the previous period. This alert catches that:

```yaml
- alert: IstioSuccessRateDrop
  expr: |
    (
      istio:success_rate_5m
      - istio:success_rate_1h
    ) < -0.05
    and
    sum(rate(istio_requests_total[5m])) by (destination_service) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Success rate drop for {{ $labels.destination_service }}"
    description: "Success rate dropped by more than 5 percentage points compared to the last hour."
```

## Grafana Dashboard Panels

### Success Rate Gauge

Create a gauge panel for each critical service:

```promql
istio:success_rate_5m{destination_service="api-gateway.default.svc.cluster.local"} * 100
```

Set thresholds: Green above 99.9%, Yellow at 99%, Red below 95%.

### Success Rate Timeline

```promql
istio:success_rate_5m * 100
```

Panel type: Time series with legend `{{destination_service}}`. Add a constant threshold line at your SLO target (e.g., 99.9%).

### Worst Performing Services Table

```promql
sort(istio:success_rate_5m * 100)
```

Panel type: Table. This quickly surfaces services with the lowest success rates.

## Handling Edge Cases

**Low-traffic services.** A service that gets one request per minute will show wild swings in success rate. Use longer windows (15m or 1h) for low-traffic services, or add minimum traffic thresholds to your alerts.

**Canary deployments.** When rolling out canaries, the canary might have a different success rate than the stable version. Use the `destination_workload` label to separate them:

```promql
sum(rate(istio_requests_total{destination_service="my-service.default.svc.cluster.local", response_code!~"5.."}[5m])) by (destination_workload)
/
sum(rate(istio_requests_total{destination_service="my-service.default.svc.cluster.local"}[5m])) by (destination_workload)
```

**Upstream failures.** If service A calls service B and B returns 503, service A's outbound metrics will show the failure against B, and B's inbound metrics will also show it. This means the same error appears in two places. This is expected - use `reporter="destination"` to see the receiving service's perspective, or `reporter="source"` to see the caller's perspective.

```promql
# Success rate as seen by the destination (server-side)
sum(rate(istio_requests_total{reporter="destination", response_code!~"5.."}[5m])) by (destination_service)
/
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)
```

## Quick Health Check from the Command Line

If you need a quick check without opening Grafana:

```bash
# Get current success rate for all services
kubectl exec -n monitoring deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'sum(rate(istio_requests_total{response_code!~"5.."}[5m])) by (destination_service) / sum(rate(istio_requests_total[5m])) by (destination_service)'
```

Success rate monitoring is foundational. Get this right, and you have a reliable signal for the overall health of every service in your mesh. Build on it with latency monitoring and error budget tracking for a complete observability setup.
