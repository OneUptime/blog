# How to Monitor Error Rates per Service in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Error Rate, Monitoring, Prometheus, Alerting, Observability

Description: Practical guide to tracking and alerting on per-service error rates in an Istio mesh using Prometheus, Grafana, and recording rules.

---

Knowing the error rate for each service in your mesh is fundamental to keeping things running smoothly. Istio captures request outcomes at the sidecar level, which means you get error rate data for every service without touching application code. The trick is knowing how to query, aggregate, and alert on this data effectively.

## Types of Errors in Istio

Before building queries, it helps to understand what kinds of errors Istio tracks:

**HTTP errors** are captured by the `response_code` label on `istio_requests_total`. These are the standard HTTP status codes (400, 403, 404, 500, 502, 503, etc.).

**gRPC errors** are captured by the `grpc_response_status` label. gRPC uses its own status code system where 0 means OK and anything else is an error.

**Envoy-level errors** show up in the `response_flags` label. These indicate problems that happened at the proxy layer, like upstream connection failures (UF), upstream connection termination (UC), no healthy upstream (UH), etc. A request can return a 503 with response flags that tell you exactly why.

## Basic Error Rate Queries

### Overall Error Rate per Service

```promql
sum(rate(istio_requests_total{response_code=~"5.."}[5m])) by (destination_service)
/
sum(rate(istio_requests_total[5m])) by (destination_service)
* 100
```

This gives the percentage of requests resulting in 5xx responses for each service.

### Error Rate by Specific Status Code

```promql
sum(rate(istio_requests_total{response_code=~"5.."}[5m])) by (destination_service, response_code)
```

Breaking down by status code is important because different 5xx codes mean different things:
- 500 Internal Server Error - application bug
- 502 Bad Gateway - upstream server returned an invalid response
- 503 Service Unavailable - service overloaded or circuit breaker tripped
- 504 Gateway Timeout - upstream did not respond in time

### Error Rate Including 4xx

Sometimes you want to track 4xx errors separately:

```promql
# 4xx rate per service
sum(rate(istio_requests_total{response_code=~"4.."}[5m])) by (destination_service)
/
sum(rate(istio_requests_total[5m])) by (destination_service)
* 100
```

A spike in 400 errors might indicate a client-side bug or a schema change. A spike in 401/403 errors could mean an auth configuration issue.

### gRPC Error Rate

```promql
sum(rate(istio_requests_total{request_protocol="grpc", grpc_response_status!="0"}[5m])) by (destination_service)
/
sum(rate(istio_requests_total{request_protocol="grpc"}[5m])) by (destination_service)
* 100
```

### Error Rate by Source Service

This shows which callers are experiencing the most errors from a given service:

```promql
sum(rate(istio_requests_total{
  destination_service="my-service.default.svc.cluster.local",
  response_code=~"5.."
}[5m])) by (source_workload)
/
sum(rate(istio_requests_total{
  destination_service="my-service.default.svc.cluster.local"
}[5m])) by (source_workload)
* 100
```

### Error Rate with Response Flags

```promql
sum(rate(istio_requests_total{
  response_code=~"5..",
  response_flags!=""
}[5m])) by (destination_service, response_flags)
```

The `response_flags` label tells you what happened at the Envoy level. Common flags include:
- `UF` - Upstream connection failure
- `UH` - No healthy upstream
- `UC` - Upstream connection termination
- `DI` - Delay injection (from fault injection)
- `RL` - Rate limited
- `NR` - No route found

## Recording Rules

Pre-compute error rates with recording rules to make dashboards and alerts faster:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-error-rate-rules
  namespace: monitoring
spec:
  groups:
    - name: istio-error-rates
      interval: 30s
      rules:
        # 5xx error rate per service
        - record: istio:error_rate_5xx_5m
          expr: |
            sum(rate(istio_requests_total{response_code=~"5.."}[5m])) by (destination_service)
            /
            sum(rate(istio_requests_total[5m])) by (destination_service)

        # 5xx error rate over 1 hour (for comparison)
        - record: istio:error_rate_5xx_1h
          expr: |
            sum(rate(istio_requests_total{response_code=~"5.."}[1h])) by (destination_service)
            /
            sum(rate(istio_requests_total[1h])) by (destination_service)

        # 5xx error count per service (for low-traffic services)
        - record: istio:error_count_5xx_5m
          expr: |
            sum(increase(istio_requests_total{response_code=~"5.."}[5m])) by (destination_service)

        # Total request rate per service
        - record: istio:request_rate_5m
          expr: |
            sum(rate(istio_requests_total[5m])) by (destination_service)

        # Error rate by source-destination pair
        - record: istio:error_rate_by_pair_5m
          expr: |
            sum(rate(istio_requests_total{response_code=~"5.."}[5m])) by (source_workload, destination_service)
            /
            sum(rate(istio_requests_total[5m])) by (source_workload, destination_service)
```

## Alerting Rules

### Error Rate Threshold Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-error-rate-alerts
  namespace: monitoring
spec:
  groups:
    - name: istio-error-rate-alerts
      rules:
        - alert: IstioHighErrorRate
          expr: |
            istio:error_rate_5xx_5m > 0.01
            and
            istio:request_rate_5m > 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High error rate for {{ $labels.destination_service }}"
            description: "Error rate is {{ $value | humanizePercentage }} for {{ $labels.destination_service }}"

        - alert: IstioCriticalErrorRate
          expr: |
            istio:error_rate_5xx_5m > 0.05
            and
            istio:request_rate_5m > 1
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Critical error rate for {{ $labels.destination_service }}"
            description: "Error rate is {{ $value | humanizePercentage }} for {{ $labels.destination_service }}"

        # Sudden error rate increase
        - alert: IstioErrorRateSpike
          expr: |
            (istio:error_rate_5xx_5m - istio:error_rate_5xx_1h) > 0.05
            and
            istio:request_rate_5m > 5
          for: 3m
          labels:
            severity: warning
          annotations:
            summary: "Error rate spike for {{ $labels.destination_service }}"
            description: "Error rate jumped by {{ $value | humanizePercentage }} compared to the last hour"
```

The minimum traffic threshold (`istio:request_rate_5m > 1`) prevents false alerts on services with very low traffic. A single error on a service that gets 1 request per minute would show a 100% error rate otherwise.

## Grafana Dashboard Design

### Error Rate Table (Ranking)

```promql
sort_desc(istio:error_rate_5xx_5m * 100)
```

Panel type: Table. Configure it with:
- Column for service name
- Column for error rate percentage with color thresholds (green < 0.1%, yellow < 1%, red > 1%)
- Column for request count

### Error Rate Timeline per Service

```promql
istio:error_rate_5xx_5m{destination_service=~"$service"} * 100
```

Panel type: Time series. Set the Y-axis unit to percent. Add a threshold line at your SLO target.

### Error Breakdown by Status Code

```promql
sum(rate(istio_requests_total{
  destination_service=~"$service",
  response_code=~"[45].."
}[5m])) by (response_code)
```

Panel type: Stacked bar chart. This shows the distribution of error types over time.

### Error Heat Map

For a mesh-wide view, create a heatmap of error rates across services and time:

```promql
istio:error_rate_5xx_5m * 100
```

Panel type: Heatmap with the Y-axis as service names.

## Investigating High Error Rates

When an alert fires, here is a systematic approach to debugging:

1. **Identify the scope.** Is it one service or multiple? Check the error rate table.

2. **Check the response code breakdown.** 502/503/504 suggest infrastructure issues. 500 suggests an application bug.

3. **Check response flags.** This narrows down the Envoy-level cause:

```promql
sum(rate(istio_requests_total{
  destination_service="failing-service.default.svc.cluster.local",
  response_code=~"5.."
}[5m])) by (response_flags)
```

4. **Check if it is source-specific:**

```promql
istio:error_rate_by_pair_5m{destination_service="failing-service.default.svc.cluster.local"} * 100
```

5. **Check pod health:**

```bash
kubectl get pods -l app=failing-service
kubectl top pods -l app=failing-service
```

6. **Check Envoy access logs for details:**

```bash
kubectl logs deploy/failing-service -c istio-proxy | grep "response_code\":\"5"
```

## Handling Noisy Alerts

Error rate alerts can be noisy if not tuned properly. A few strategies:

- **Use minimum traffic thresholds.** Do not alert on services with fewer than 1 rps.
- **Use longer `for` durations.** Instead of alerting immediately, wait 5-10 minutes to filter out brief blips.
- **Separate critical services.** Have different thresholds for customer-facing services versus internal batch jobs.
- **Use burn-rate alerting.** Instead of a flat threshold, alert when the error rate is burning through your SLO budget too fast. This approach produces fewer, more actionable alerts.

Per-service error rate monitoring is the foundation of mesh observability. Get the recording rules and alerts in place, build a good Grafana dashboard, and your team will be able to detect and respond to service degradation quickly.
