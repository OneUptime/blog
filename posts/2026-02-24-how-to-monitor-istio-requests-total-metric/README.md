# How to Monitor istio_requests_total Metric

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Metrics, Prometheus, Istio_requests_total, Monitoring

Description: Deep dive into the istio_requests_total metric covering its labels, common PromQL queries, alerting patterns, and best practices for production monitoring.

---

The `istio_requests_total` metric is arguably the most important metric in your Istio service mesh. It's a counter that increments for every HTTP, gRPC, and HTTP/2 request processed by the Envoy sidecars. From this single metric, you can derive request rates, error rates, success rates, traffic patterns, and service dependencies. If you only monitor one Istio metric, make it this one.

## What istio_requests_total Tracks

Every time a request flows through an Envoy sidecar, `istio_requests_total` increments by 1. It's a Prometheus counter, which means it only goes up (or resets to 0 when the proxy restarts). You always use it with `rate()` or `increase()` to get useful values.

## The Labels

The power of `istio_requests_total` is in its labels. Here's what a typical sample looks like:

```text
istio_requests_total{
  reporter="destination",
  source_workload="frontend",
  source_workload_namespace="default",
  source_principal="spiffe://cluster.local/ns/default/sa/frontend",
  destination_workload="api-service",
  destination_workload_namespace="default",
  destination_service="api-service.default.svc.cluster.local",
  destination_service_name="api-service",
  destination_service_namespace="default",
  destination_principal="spiffe://cluster.local/ns/default/sa/api-service",
  request_protocol="http",
  response_code="200",
  response_flags="-",
  connection_security_policy="mutual_tls",
  grpc_response_status=""
} 15234
```

Here's what each label means:

**reporter** - who's reporting this metric. `"destination"` means the server-side proxy reported it; `"source"` means the client-side proxy. Each request creates two data points.

**source_workload / destination_workload** - the name of the sending and receiving workload (usually matches the Deployment name).

**source_workload_namespace / destination_workload_namespace** - the namespace of each workload.

**source_principal / destination_principal** - the SPIFFE identity of each side. Useful for zero-trust auditing but adds cardinality. Often removed in production.

**destination_service** - the full DNS name of the destination service.

**request_protocol** - `"http"`, `"grpc"`, or `"tcp"`.

**response_code** - the HTTP response status code as a string.

**response_flags** - Envoy-specific flags indicating special conditions (circuit breaking, timeouts, etc.). `"-"` means no flags.

**connection_security_policy** - `"mutual_tls"` or `"none"`.

**grpc_response_status** - the gRPC status code (empty for non-gRPC requests).

## Essential Queries

### Request Rate

```promql
# Requests per second for a specific service
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="api-service",
  destination_workload_namespace="production"
}[5m]))
```

### Error Rate

```promql
# Server error rate (5xx)
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="api-service",
  response_code=~"5.."
}[5m]))
/
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="api-service"
}[5m]))
```

### Success Rate (Availability)

```promql
# Availability percentage
(
  1 - (
    sum(rate(istio_requests_total{
      reporter="destination",
      destination_workload="api-service",
      response_code=~"5.."
    }[5m]))
    /
    sum(rate(istio_requests_total{
      reporter="destination",
      destination_workload="api-service"
    }[5m]))
  )
) * 100
```

### Traffic by Response Code

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="api-service"
}[5m])) by (response_code)
```

### Service Dependencies

Find all services that call a specific service:

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="payment-service"
}[5m])) by (source_workload) > 0
```

Find all services that a specific service calls:

```promql
sum(rate(istio_requests_total{
  reporter="source",
  source_workload="order-service"
}[5m])) by (destination_workload) > 0
```

### Mesh-Wide Error Overview

```promql
# Error rate for every service in the mesh
sum(rate(istio_requests_total{reporter="destination",response_code=~"5.."}[5m])) by (destination_workload, destination_workload_namespace)
/
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_workload, destination_workload_namespace)
```

## Understanding the Reporter Label

The `reporter` label is critical and frequently misunderstood. Every request is reported twice:

1. By the source proxy (client side) with `reporter="source"`
2. By the destination proxy (server side) with `reporter="destination"`

In most cases, you want `reporter="destination"` because:
- It reflects what the server actually received
- It's more reliable (the destination proxy is closer to the actual service)
- Response codes come from the actual service, not from intermediate failures

Use `reporter="source"` when you want the client's perspective, like when debugging connectivity issues where requests might not even reach the destination.

```promql
# Compare source vs destination reported error rates
# If source shows more errors than destination, requests are failing in transit
sum(rate(istio_requests_total{
  reporter="source",
  source_workload="frontend",
  destination_workload="api-service",
  response_code=~"5.."
}[5m]))

# vs

sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="api-service",
  response_code=~"5.."
}[5m]))
```

## Response Flags

The `response_flags` label tells you about Envoy-specific behaviors. Common values:

| Flag | Meaning |
|------|---------|
| `-` | No flags, normal response |
| `UO` | Upstream overflow (circuit breaker) |
| `UF` | Upstream connection failure |
| `UC` | Upstream connection termination |
| `UT` | Upstream request timeout |
| `NR` | No route configured |
| `URX` | Upstream retry limit exceeded |
| `DC` | Downstream connection termination |
| `RL` | Rate limited |
| `DI` | Delay injected (fault injection) |
| `FI` | Abort injected (fault injection) |

Query by response flags to find infrastructure issues:

```promql
# Requests that hit circuit breakers
sum(rate(istio_requests_total{
  response_flags="UO"
}[5m])) by (source_workload, destination_workload)

# Upstream connection failures
sum(rate(istio_requests_total{
  response_flags="UF"
}[5m])) by (destination_workload)

# Timed out requests
sum(rate(istio_requests_total{
  response_flags="UT"
}[5m])) by (destination_workload)
```

## Alerting on istio_requests_total

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-request-alerts
  namespace: monitoring
spec:
  groups:
    - name: istio-requests
      rules:
        - alert: HighServerErrorRate
          expr: |
            (
              sum(rate(istio_requests_total{reporter="destination",response_code=~"5.."}[5m]))
              by (destination_workload, destination_workload_namespace)
              /
              sum(rate(istio_requests_total{reporter="destination"}[5m]))
              by (destination_workload, destination_workload_namespace)
            ) > 0.01
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "{{ $labels.destination_workload }} has {{ $value | humanizePercentage }} error rate"

        - alert: CircuitBreakerTripping
          expr: |
            sum(rate(istio_requests_total{response_flags="UO"}[5m]))
            by (source_workload, destination_workload) > 0
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "Circuit breaker tripping from {{ $labels.source_workload }} to {{ $labels.destination_workload }}"

        - alert: UpstreamConnectionFailures
          expr: |
            sum(rate(istio_requests_total{response_flags="UF"}[5m]))
            by (destination_workload) > 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Upstream connection failures to {{ $labels.destination_workload }}"
```

## Recording Rules

For frequently queried aggregations, create recording rules:

```yaml
rules:
  - record: istio:service:request_rate_5m
    expr: |
      sum(rate(istio_requests_total{reporter="destination"}[5m]))
      by (destination_workload, destination_workload_namespace)

  - record: istio:service:error_rate_5m
    expr: |
      sum(rate(istio_requests_total{reporter="destination",response_code=~"5.."}[5m]))
      by (destination_workload, destination_workload_namespace)
      /
      sum(rate(istio_requests_total{reporter="destination"}[5m]))
      by (destination_workload, destination_workload_namespace)
```

## Cardinality Considerations

With all its labels, `istio_requests_total` generates a lot of time series. In a mesh with 50 services, 10 response codes, and 2 reporters, you get thousands of series from this metric alone. If your Prometheus is struggling, consider:

- Removing unused labels via the Telemetry API
- Disabling client-side reporting (keep only `reporter="destination"`)
- Dropping the `source_principal` and `destination_principal` labels

The `istio_requests_total` metric is your primary tool for understanding what's happening in your mesh. Learn its labels, build your dashboards around it, and set up alerts based on error rates derived from it. Everything else is secondary.
