# How to Set Up Alerting for High Error Rate in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Alerting, Error Rate, Prometheus, SRE, Monitoring

Description: Complete guide to configuring error rate alerts in Istio with Prometheus, covering HTTP errors, gRPC errors, and SLO-based alerting strategies.

---

Error rate is probably the single most important metric to alert on in any service mesh. A spike in errors means something is broken, and you need to know about it immediately. Istio gives you error rate metrics out of the box for every service in your mesh, which makes setting up alerting relatively painless.

## Understanding Error Metrics in Istio

Istio tracks the `istio_requests_total` metric with a `response_code` label. This lets you calculate error rates for any service by dividing error responses by total responses. The metric is recorded by both the source and destination proxies.

For HTTP traffic, errors are typically 5xx response codes. For gRPC traffic, error codes are captured in the `grpc_response_status` label.

Quick check of your current error rates:

```promql
# Overall mesh error rate
sum(rate(istio_requests_total{response_code=~"5.*"}[5m]))
/
sum(rate(istio_requests_total[5m]))
```

## Basic Error Rate Alerts

Start with these foundational alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-error-rate-alerts
  namespace: istio-system
spec:
  groups:
  - name: istio-error-rate
    rules:
    - alert: IstioHighErrorRate
      expr: |
        (
          sum(rate(istio_requests_total{response_code=~"5.*",reporter="destination"}[5m]))
          by (destination_workload, destination_workload_namespace)
          /
          sum(rate(istio_requests_total{reporter="destination"}[5m]))
          by (destination_workload, destination_workload_namespace)
        ) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate on {{ $labels.destination_workload }}"
        description: "{{ $labels.destination_workload }} in {{ $labels.destination_workload_namespace }} has a {{ $value | humanizePercentage }} error rate"
    - alert: IstioErrorRateAboveBaseline
      expr: |
        (
          sum(rate(istio_requests_total{response_code=~"5.*",reporter="destination"}[5m]))
          by (destination_workload, destination_workload_namespace)
          /
          sum(rate(istio_requests_total{reporter="destination"}[5m]))
          by (destination_workload, destination_workload_namespace)
        ) > 0.01
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Elevated error rate on {{ $labels.destination_workload }}"
        description: "Error rate is {{ $value | humanizePercentage }} for {{ $labels.destination_workload }}"
```

## Filtering Out Low-Traffic Noise

A common problem with error rate alerts is false positives on low-traffic services. If a service gets 1 request per minute and that request fails, the error rate is 100%. That is technically true but probably not worth waking someone up for.

Add a minimum traffic threshold:

```yaml
    - alert: IstioHighErrorRateWithTraffic
      expr: |
        (
          sum(rate(istio_requests_total{response_code=~"5.*",reporter="destination"}[5m]))
          by (destination_workload, destination_workload_namespace)
          /
          sum(rate(istio_requests_total{reporter="destination"}[5m]))
          by (destination_workload, destination_workload_namespace)
        ) > 0.05
        and
        sum(rate(istio_requests_total{reporter="destination"}[5m]))
        by (destination_workload, destination_workload_namespace)
        > 1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate with significant traffic on {{ $labels.destination_workload }}"
```

The `> 1` means we only alert when the service is handling more than 1 request per second.

## gRPC Error Rate Alerts

For gRPC services, HTTP status codes are less meaningful. Use the gRPC status instead:

```yaml
    - alert: IstioHighGrpcErrorRate
      expr: |
        (
          sum(rate(istio_requests_total{
            grpc_response_status!~"0|",
            reporter="destination"
          }[5m])) by (destination_workload, destination_workload_namespace)
          /
          sum(rate(istio_requests_total{
            request_protocol="grpc",
            reporter="destination"
          }[5m])) by (destination_workload, destination_workload_namespace)
        ) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High gRPC error rate on {{ $labels.destination_workload }}"
```

gRPC status code 0 means OK. Anything else is an error of some kind, though some status codes like CANCELLED (code 1) might be expected in certain scenarios.

## Error Rate by Response Code

Sometimes you want different alerts for different error types:

```yaml
    # 503 Service Unavailable - often indicates upstream issues
    - alert: IstioHigh503Rate
      expr: |
        sum(rate(istio_requests_total{response_code="503",reporter="destination"}[5m]))
        by (destination_workload, destination_workload_namespace)
        > 0.5
      for: 3m
      labels:
        severity: critical
      annotations:
        summary: "High 503 rate on {{ $labels.destination_workload }}"
        description: "Getting {{ $value }} 503s/sec. Upstream might be down or circuit breaker is open."

    # 429 Too Many Requests - rate limiting is kicking in
    - alert: IstioHigh429Rate
      expr: |
        sum(rate(istio_requests_total{response_code="429",reporter="destination"}[5m]))
        by (destination_workload, destination_workload_namespace)
        > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Rate limiting active on {{ $labels.destination_workload }}"
        description: "{{ $value }} requests/sec are being rate-limited"

    # 502/504 Gateway errors
    - alert: IstioGatewayErrors
      expr: |
        sum(rate(istio_requests_total{response_code=~"502|504",reporter="source"}[5m]))
        by (destination_workload, destination_workload_namespace)
        > 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Gateway errors reaching {{ $labels.destination_workload }}"
```

## SLO-Based Error Rate Alerting

For production systems, SLO-based alerting with burn rates is more effective than static thresholds. The idea is to alert based on how quickly you are consuming your error budget:

```yaml
    # Record the error ratio for SLO tracking
    - record: istio:service:error_ratio_5m
      expr: |
        sum(rate(istio_requests_total{response_code=~"5.*",reporter="destination"}[5m]))
        by (destination_workload, destination_workload_namespace)
        /
        sum(rate(istio_requests_total{reporter="destination"}[5m]))
        by (destination_workload, destination_workload_namespace)

    - record: istio:service:error_ratio_1h
      expr: |
        sum(rate(istio_requests_total{response_code=~"5.*",reporter="destination"}[1h]))
        by (destination_workload, destination_workload_namespace)
        /
        sum(rate(istio_requests_total{reporter="destination"}[1h]))
        by (destination_workload, destination_workload_namespace)

    # Fast burn: 14.4x budget consumption (2% error rate for 99.9% SLO)
    - alert: IstioErrorBudgetFastBurn
      expr: |
        istio:service:error_ratio_5m > (14.4 * 0.001)
        and
        istio:service:error_ratio_1h > (14.4 * 0.001)
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Fast error budget burn for {{ $labels.destination_workload }}"
        description: "At current error rate, the monthly error budget will be exhausted in less than 2 days"

    # Slow burn: 3x budget consumption
    - alert: IstioErrorBudgetSlowBurn
      expr: |
        istio:service:error_ratio_1h > (3 * 0.001)
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Slow error budget burn for {{ $labels.destination_workload }}"
```

## Client-Side vs Server-Side Error Detection

Istio lets you see errors from both perspectives. Sometimes the server thinks it responded successfully, but the client sees an error because the proxy injected a 503 or the connection was reset:

```yaml
    - alert: IstioClientSideErrors
      expr: |
        (
          sum(rate(istio_requests_total{response_code=~"5.*",reporter="source"}[5m]))
          by (source_workload, destination_workload, destination_workload_namespace)
          -
          sum(rate(istio_requests_total{response_code=~"5.*",reporter="destination"}[5m]))
          by (source_workload, destination_workload, destination_workload_namespace)
        ) > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Network-level errors between {{ $labels.source_workload }} and {{ $labels.destination_workload }}"
        description: "Client sees more errors than server reports. Possible network issue or proxy error."
```

## Validating Your Alert Setup

Test that your alerts fire correctly using Istio fault injection:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: test-error-alert
  namespace: default
spec:
  hosts:
  - my-service
  http:
  - fault:
      abort:
        percentage:
          value: 10
        httpStatus: 500
    route:
    - destination:
        host: my-service
```

This injects 500 errors for 10% of traffic. Apply it, wait for the `for` duration of your alert, and verify you get notified. Clean up the VirtualService after testing.

Error rate alerting is the backbone of service reliability monitoring. Get it right, and you will catch most production issues within minutes. The key is balancing sensitivity (catching real issues fast) with specificity (not drowning in false alarms). Start broad, observe the noise, and refine from there.
