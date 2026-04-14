# How to Monitor Dapr Service Invocation Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Invocation, Metric, Observability, Prometheus

Description: Monitor Dapr service-to-service invocation request rates, latency, and success rates to detect connectivity issues between microservices.

---

Dapr service invocation is the primary way services communicate in a Dapr-enabled cluster. Unlike direct HTTP calls, Dapr routes all requests through the sidecar, giving you built-in metrics for every service-to-service call.

## Service Invocation Metric Types

Dapr captures metrics from both the calling service (client) and the receiving service (server):

**Server-side metrics:**
- `dapr_http_server_request_count` - total HTTP requests received
- `dapr_http_server_latency` - server-side processing latency
- `dapr_grpc_io_server_server_latency` - gRPC server latency

**Client-side metrics:**
- `dapr_http_client_roundtrip_latency` - full round-trip latency including network
- `dapr_grpc_io_client_roundtrip_latency` - gRPC client call latency

Labels available: `app_id`, `method`, `status`

## Request Rate Queries

```text
# Incoming request rate per app and method
sum by (app_id, method) (
  rate(dapr_http_server_request_count[5m])
)

# Outgoing call rate (client side)
sum by (app_id) (
  rate(dapr_http_client_roundtrip_latency_count[5m])
)

# HTTP status breakdown
sum by (app_id, status) (
  rate(dapr_http_server_request_count[5m])
)
```

## Success Rate per Service

```text
# Success rate per receiving app
1 - (
  sum by (app_id) (
    rate(dapr_http_server_request_count{status!~"2.."}[5m])
  )
  / sum by (app_id) (
    rate(dapr_http_server_request_count[5m])
  )
)

# Services with success rate below 99%
(
  1 - sum by (app_id) (
    rate(dapr_http_server_request_count{status!~"2.."}[5m])
  )
  / sum by (app_id) (
    rate(dapr_http_server_request_count[5m])
  )
) < 0.99
```

## Round-Trip vs Server-Side Latency

The difference between client round-trip and server-side latency reveals network overhead:

```text
# Server-side P99 latency
histogram_quantile(0.99,
  sum by (le, app_id) (
    rate(dapr_http_server_latency_bucket[5m])
  )
)

# Client round-trip P99 latency
histogram_quantile(0.99,
  sum by (le, app_id) (
    rate(dapr_http_client_roundtrip_latency_bucket[5m])
  )
)
```

Large differences indicate network or sidecar-to-sidecar communication overhead.

## Top Callers by Request Volume

```text
# Top 10 apps by received request volume
topk(10,
  sum by (app_id) (
    rate(dapr_http_server_request_count[5m])
  )
)
```

## Alert Rules

```yaml
groups:
- name: dapr-service-invocation
  rules:
  - alert: DaprServiceHighErrorRate
    expr: |
      sum by (app_id) (
        rate(dapr_http_server_request_count{status="500"}[5m])
      )
      / sum by (app_id) (
        rate(dapr_http_server_request_count[5m])
      ) > 0.01
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Service {{ $labels.app_id }} has >1% 500 errors"

  - alert: DaprServiceNotReceivingTraffic
    expr: |
      sum by (app_id) (
        rate(dapr_http_server_request_count[5m])
      ) == 0
    for: 10m
    labels:
      severity: info
    annotations:
      summary: "No traffic to {{ $labels.app_id }} in the last 10 minutes"
```

## Summary

Dapr service invocation metrics provide both client-side and server-side visibility for every service-to-service call. Compare round-trip and server-side latency to isolate network overhead from application processing time. Monitor success rates per app and method to quickly identify which endpoints are failing, and use the client-side metrics to understand call patterns between services.
