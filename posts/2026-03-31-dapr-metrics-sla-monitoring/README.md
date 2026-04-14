# How to Use Dapr Metrics for SLA Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SLA, Metric, Observability, Prometheus

Description: Use Dapr Prometheus metrics to define, track, and report on SLI and SLO compliance for availability, latency, and error rate targets.

---

Service Level Agreements (SLAs) require measurable Service Level Indicators (SLIs) tracked against Service Level Objectives (SLOs). Dapr's Prometheus metrics provide the raw signals needed to build a complete SLA monitoring system without additional instrumentation.

## Defining SLIs from Dapr Metrics

Common SLIs for Dapr-based services:

| SLI | Dapr Metric | Description |
|-----|-------------|-------------|
| Availability | `dapr_http_server_request_count` | % of non-5xx responses |
| Latency | `dapr_http_server_latency` | P99 response time |
| Throughput | `dapr_http_server_request_count` | Requests per second |

## Availability SLI Query

```text
# 28-day availability (good requests / total requests)
sum_over_time(
  (
    sum(rate(dapr_http_server_request_count{status!~"5.."}[5m]))
    / sum(rate(dapr_http_server_request_count[5m]))
  )[28d:5m]
) / count_over_time(
  (sum(rate(dapr_http_server_request_count[5m])))[28d:5m]
)
```

For a simpler rolling window:

```text
# Rolling 7-day availability
1 - (
  sum(rate(dapr_http_server_request_count{status=~"5.."}[7d]))
  / sum(rate(dapr_http_server_request_count[7d]))
)
```

## Latency SLI Query

```text
# % of requests completing under 300ms (latency SLI)
sum(
  rate(dapr_http_server_latency_bucket{le="300", app_id="order-service"}[5m])
)
/ sum(
  rate(dapr_http_server_latency_count{app_id="order-service"}[5m])
)
```

## Error Budget Calculation

If your SLO is 99.9% availability, your monthly error budget is 43.8 minutes.

```text
# Remaining error budget as a fraction (30-day window)
(
  (1 - 0.999)  # error budget
  - (
    1 - (
      sum(rate(dapr_http_server_request_count{status!~"5.."}[30d]))
      / sum(rate(dapr_http_server_request_count[30d]))
    )
  )
) / (1 - 0.999)
```

## Prometheus Recording Rules for SLIs

Use recording rules to pre-compute SLIs for efficient querying:

```yaml
groups:
- name: dapr-sli-recording
  interval: 5m
  rules:
  - record: sli:dapr_availability:rate5m
    expr: |
      sum by (app_id) (rate(dapr_http_server_request_count{status!~"5.."}[5m]))
      / sum by (app_id) (rate(dapr_http_server_request_count[5m]))

  - record: sli:dapr_latency_p99:rate5m
    expr: |
      histogram_quantile(0.99,
        sum by (le, app_id) (rate(dapr_http_server_latency_bucket[5m]))
      )
```

## SLO Alert Rules (Burn Rate Alerting)

Use multi-window burn rate alerts to detect SLO threats at multiple time scales:

```yaml
groups:
- name: dapr-slo-alerts
  rules:
  - alert: DaprSLOHighBurnRate
    expr: |
      (
        1 - sum(rate(dapr_http_server_request_count{status!~"5.."}[1h]))
          / sum(rate(dapr_http_server_request_count[1h]))
      ) > 14.4 * (1 - 0.999)
    for: 2m
    labels:
      severity: critical
      page: "true"
    annotations:
      summary: "Dapr SLO burning too fast - high burn rate alert"

  - alert: DaprSLOLowBurnRate
    expr: |
      (
        1 - sum(rate(dapr_http_server_request_count{status!~"5.."}[6h]))
          / sum(rate(dapr_http_server_request_count[6h]))
      ) > 6 * (1 - 0.999)
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "Dapr SLO burn rate elevated - slow burn alert"
```

## Grafana SLO Dashboard

Create a stat panel showing current availability vs SLO target:

```text
# Current 7-day availability
1 - (
  sum(rate(dapr_http_server_request_count{status=~"5.."}[7d]))
  / sum(rate(dapr_http_server_request_count[7d]))
)
```

Set thresholds: green above 0.999, yellow above 0.99, red below 0.99.

## Summary

Dapr metrics provide all the signals needed for SLA monitoring through availability (non-5xx rate), latency percentiles, and throughput metrics. Use Prometheus recording rules to pre-compute SLIs and burn rate alerting to detect SLO violations at both fast and slow burn rates. A Grafana dashboard showing current SLI values against SLO targets gives teams instant visibility into compliance status.
