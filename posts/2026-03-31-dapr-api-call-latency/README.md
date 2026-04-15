# How to Monitor Dapr API Call Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Metric, Latency, Observability, Prometheus

Description: Track and analyze Dapr API call latency using Prometheus histograms to identify slow services and meet latency SLOs.

---

Latency is one of the most important signals for any distributed system. Dapr exposes histogram metrics for all API calls, including service invocation, state store operations, and pub/sub, making it possible to calculate percentiles and track SLO compliance.

## Understanding Dapr Latency Metrics

Dapr uses Prometheus histograms, which expose three metric types:

- `_bucket` - count of requests below each latency threshold
- `_sum` - total latency accumulated
- `_count` - total number of requests

Key latency metrics include:

- `dapr_http_server_latency` - HTTP server-side latency
- `dapr_http_client_roundtrip_latency` - HTTP client round-trip latency
- `dapr_grpc_io_server_server_latency` - gRPC server-side latency
- `dapr_component_state_latencies` - state store latency (with `operation` label for get, set, delete, etc.)
- `dapr_component_pubsub_ingress_latencies` - pub/sub message processing latency

## Calculating Latency Percentiles

Use `histogram_quantile` to compute P50, P95, and P99:

```text
# P99 HTTP server latency per app
histogram_quantile(0.99,
  sum by (le, app_id) (
    rate(dapr_http_server_latency_bucket[5m])
  )
)

# P95 gRPC latency
histogram_quantile(0.95,
  sum by (le, app_id) (
    rate(dapr_grpc_io_server_server_latency_bucket[5m])
  )
)

# Average latency
sum by (app_id) (rate(dapr_http_server_latency_sum[5m]))
/ sum by (app_id) (rate(dapr_http_server_latency_count[5m]))
```

## Grafana Multi-Percentile Panel

Create a panel showing P50/P95/P99 on the same chart:

```text
# Query A - P50
histogram_quantile(0.50, sum by (le) (rate(dapr_http_server_latency_bucket{app_id="$app_id"}[5m])))

# Query B - P95
histogram_quantile(0.95, sum by (le) (rate(dapr_http_server_latency_bucket{app_id="$app_id"}[5m])))

# Query C - P99
histogram_quantile(0.99, sum by (le) (rate(dapr_http_server_latency_bucket{app_id="$app_id"}[5m])))
```

Set the unit to milliseconds and add thresholds at your SLO boundaries.

## Correlating Latency with Errors

High latency often appears alongside errors. Combine the signals:

```text
# Services with both high latency AND errors
(
  histogram_quantile(0.99, sum by (le, app_id) (rate(dapr_http_server_latency_bucket[5m]))) > 500
)
and
(
  sum by (app_id) (rate(dapr_http_server_request_count{status!~"2.."}[5m])) > 0
)
```

## Alerting on Latency SLOs

```yaml
groups:
- name: dapr-latency
  rules:
  - alert: DaprP99LatencyHigh
    expr: |
      histogram_quantile(0.99,
        sum by (le, app_id) (
          rate(dapr_http_server_latency_bucket[5m])
        )
      ) > 500
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "P99 latency for {{ $labels.app_id }} exceeds 500ms"
      description: "Current P99 is {{ $value }}ms"
```

## Investigating Slow Requests with Distributed Tracing

When you identify a slow service in metrics, drill into traces to find the root cause:

```bash
# Find traces with high latency in Jaeger
curl "http://localhost:16686/api/traces?service=order-service&minDuration=500ms&limit=20"
```

Look for slow spans in state store calls or downstream service invocations.

## Summary

Dapr API call latency is measured using Prometheus histograms, enabling accurate percentile calculations with `histogram_quantile`. Monitor P50, P95, and P99 for each app separately, as different services have different latency characteristics. Alert when P99 exceeds your SLO threshold and correlate with traces to identify whether slowness originates in the Dapr sidecar, downstream services, or backing components.
