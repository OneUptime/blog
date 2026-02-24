# How to Set Up SLI/SLO Monitoring with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, SLI, SLO, Monitoring, SRE, Reliability

Description: How to define and monitor Service Level Indicators and Objectives using Istio metrics for data-driven reliability engineering.

---

Service Level Objectives (SLOs) give you a framework for making reliability decisions based on data rather than gut feelings. Should you push that risky deployment? Check the error budget. Is the service reliable enough to ship new features? Look at the SLO compliance. Istio generates exactly the metrics you need to build SLI/SLO monitoring, because it captures request success rates and latency for every service automatically.

## Understanding SLIs and SLOs

Quick definitions for clarity:

- **SLI (Service Level Indicator)**: A quantitative measure of some aspect of the service. For example, "the proportion of successful requests" or "the proportion of requests faster than 200ms."
- **SLO (Service Level Objective)**: A target value for an SLI. For example, "99.9% of requests should be successful" or "95% of requests should be faster than 200ms."
- **Error Budget**: The amount of unreliability you are allowed. If your SLO is 99.9%, your error budget is 0.1%.

## Defining SLIs with Istio Metrics

Istio provides two key metrics that map directly to the most common SLIs:

1. `istio_requests_total` - for availability/success rate SLIs
2. `istio_request_duration_milliseconds_bucket` - for latency SLIs

### Availability SLI

The availability SLI measures the proportion of non-error responses:

```promql
# Availability SLI: ratio of successful requests
sum(rate(istio_requests_total{
  reporter="destination",
  destination_service_name="order-service",
  response_code!~"5.*"
}[5m]))
/
sum(rate(istio_requests_total{
  reporter="destination",
  destination_service_name="order-service"
}[5m]))
```

### Latency SLI

The latency SLI measures the proportion of requests faster than a threshold:

```promql
# Latency SLI: ratio of requests under 200ms
sum(rate(istio_request_duration_milliseconds_bucket{
  reporter="destination",
  destination_service_name="order-service",
  le="200"
}[5m]))
/
sum(rate(istio_request_duration_milliseconds_bucket{
  reporter="destination",
  destination_service_name="order-service",
  le="+Inf"
}[5m]))
```

## Setting Up SLO Recording Rules

Raw SLI queries are expensive to compute repeatedly. Use Prometheus recording rules to pre-compute them:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-slo-recording-rules
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
  - name: istio-slo-availability
    interval: 30s
    rules:
    # Total requests
    - record: istio_sli:requests:rate5m
      expr: |
        sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_namespace, destination_service_name)

    # Successful requests
    - record: istio_sli:requests_success:rate5m
      expr: |
        sum(rate(istio_requests_total{reporter="destination",response_code!~"5.*"}[5m])) by (destination_service_namespace, destination_service_name)

    # Availability SLI (5m window)
    - record: istio_sli:availability:ratio_rate5m
      expr: |
        istio_sli:requests_success:rate5m / istio_sli:requests:rate5m

    # Availability over various windows for multi-window alerting
    - record: istio_sli:availability:ratio_rate30m
      expr: |
        sum(rate(istio_requests_total{reporter="destination",response_code!~"5.*"}[30m])) by (destination_service_namespace, destination_service_name)
        /
        sum(rate(istio_requests_total{reporter="destination"}[30m])) by (destination_service_namespace, destination_service_name)

    - record: istio_sli:availability:ratio_rate1h
      expr: |
        sum(rate(istio_requests_total{reporter="destination",response_code!~"5.*"}[1h])) by (destination_service_namespace, destination_service_name)
        /
        sum(rate(istio_requests_total{reporter="destination"}[1h])) by (destination_service_namespace, destination_service_name)

    - record: istio_sli:availability:ratio_rate6h
      expr: |
        sum(rate(istio_requests_total{reporter="destination",response_code!~"5.*"}[6h])) by (destination_service_namespace, destination_service_name)
        /
        sum(rate(istio_requests_total{reporter="destination"}[6h])) by (destination_service_namespace, destination_service_name)

  - name: istio-slo-latency
    interval: 30s
    rules:
    # Latency SLI: proportion under 200ms
    - record: istio_sli:latency_200ms:ratio_rate5m
      expr: |
        sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination",le="200"}[5m])) by (destination_service_namespace, destination_service_name)
        /
        sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination",le="+Inf"}[5m])) by (destination_service_namespace, destination_service_name)

    - record: istio_sli:latency_200ms:ratio_rate1h
      expr: |
        sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination",le="200"}[1h])) by (destination_service_namespace, destination_service_name)
        /
        sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination",le="+Inf"}[1h])) by (destination_service_namespace, destination_service_name)
```

## Multi-Window, Multi-Burn-Rate Alerting

The most effective SLO alerting strategy is multi-window, multi-burn-rate. Instead of alerting on a single threshold, you alert based on how fast you are burning through your error budget:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-slo-burn-rate-alerts
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
  - name: istio-slo-burn-rate
    rules:
    # Fast burn: 14.4x burn rate over 1h, confirmed over 5m
    # This catches severe incidents that will exhaust the budget in ~2.5 days
    - alert: SLOHighBurnRate
      expr: |
        (
          1 - istio_sli:availability:ratio_rate1h{destination_service_name="order-service"}
        ) > (14.4 * 0.001)
        and
        (
          1 - istio_sli:availability:ratio_rate5m{destination_service_name="order-service"}
        ) > (14.4 * 0.001)
      for: 2m
      labels:
        severity: critical
        slo: availability
        service: order-service
      annotations:
        summary: "High error budget burn rate for order-service"
        description: "order-service is burning through its error budget at 14.4x the sustainable rate."

    # Medium burn: 6x burn rate over 6h, confirmed over 30m
    - alert: SLOMediumBurnRate
      expr: |
        (
          1 - istio_sli:availability:ratio_rate6h{destination_service_name="order-service"}
        ) > (6 * 0.001)
        and
        (
          1 - istio_sli:availability:ratio_rate30m{destination_service_name="order-service"}
        ) > (6 * 0.001)
      for: 5m
      labels:
        severity: warning
        slo: availability
        service: order-service
      annotations:
        summary: "Medium error budget burn rate for order-service"
        description: "order-service is burning through its error budget at 6x the sustainable rate."
```

The math behind this: if your SLO is 99.9% (error budget = 0.001), a 14.4x burn rate means you are consuming errors at 14.4 times the sustainable rate. At this rate, you would exhaust your monthly error budget in about 2.5 days.

## Error Budget Calculation

Track how much error budget remains:

```promql
# Error budget remaining (30-day window)
# For a 99.9% SLO, the budget is 0.001
1 - (
  (1 - istio_sli:availability:ratio_rate30d{destination_service_name="order-service"})
  / 0.001
)
```

This gives you a value between 0 and 1 representing how much budget is left. At 0, you have exhausted your budget. Below 0, you have exceeded it.

For this to work over a 30-day window, you need Prometheus to retain at least 30 days of data.

## SLO Dashboard

Build a Grafana dashboard that shows SLO compliance at a glance:

**Error Budget Panel:**
Display the remaining error budget as a gauge panel. Set thresholds at 75% (green), 50% (yellow), 25% (orange), 0% (red).

**SLI Over Time:**
Show the rolling availability SLI as a time series:

```promql
istio_sli:availability:ratio_rate1h{destination_service_name="order-service"}
```

Add a horizontal line at the SLO target (e.g., 0.999) so you can immediately see when the SLI drops below target.

**Burn Rate Panel:**
Show the current burn rate as a stat panel:

```promql
(1 - istio_sli:availability:ratio_rate1h{destination_service_name="order-service"}) / 0.001
```

A burn rate of 1.0 means you are consuming error budget at exactly the sustainable rate. Above 1.0 means you are consuming faster than sustainable.

## Per-Endpoint SLOs

Some services need different SLOs for different endpoints. A payment endpoint might need 99.99% while a search endpoint is fine at 99.5%:

```promql
# Payment endpoint availability
sum(rate(istio_requests_total{
  reporter="destination",
  destination_service_name="api-gateway",
  request_url_path=~"/api/payments.*",
  response_code!~"5.*"
}[5m]))
/
sum(rate(istio_requests_total{
  reporter="destination",
  destination_service_name="api-gateway",
  request_url_path=~"/api/payments.*"
}[5m]))
```

Note that you need to enable request path metrics in Istio's telemetry configuration for this to work:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: detailed-metrics
  namespace: production
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
        mode: SERVER
      tagOverrides:
        request_url_path:
          operation: UPSERT
          value: "request.url_path"
```

## Integrating with SLO Platforms

For teams using dedicated SLO platforms like OneUptime, Nobl9, or Sloth, you can export Istio metrics to these tools.

Sloth generates Prometheus recording rules from a simple SLO definition:

```yaml
version: "prometheus/v1"
service: "order-service"
labels:
  owner: "order-team"
slos:
- name: "requests-availability"
  objective: 99.9
  description: "99.9% of requests should be successful"
  sli:
    events:
      error_query: sum(rate(istio_requests_total{reporter="destination",destination_service_name="order-service",response_code=~"5.*"}[{{.window}}]))
      total_query: sum(rate(istio_requests_total{reporter="destination",destination_service_name="order-service"}[{{.window}}]))
  alerting:
    name: OrderServiceAvailability
    labels:
      category: "availability"
    annotations:
      summary: "Order service availability SLO breach"
    page_alert:
      labels:
        severity: critical
    ticket_alert:
      labels:
        severity: warning
```

SLI/SLO monitoring with Istio transforms your reliability practice from reactive to proactive. Instead of waiting for users to complain, you know exactly where you stand against your reliability targets at any point in time. The error budget model gives you a data-driven framework for balancing reliability with feature velocity.
