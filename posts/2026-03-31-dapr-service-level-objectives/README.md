# How to Implement Service Level Objectives (SLO) for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SLO, Reliability, Observability, Monitoring

Description: Learn how to define, measure, and alert on Service Level Objectives for Dapr microservices using error budgets and Prometheus.

---

## What Are SLOs and Why Do They Matter for Dapr?

A Service Level Objective (SLO) is a target value for an SLI - for example, "99.9% of requests to the checkout service must succeed." In a Dapr-based architecture, SLOs help teams balance reliability investments with feature development by quantifying an error budget.

Dapr's per-sidecar metrics make it straightforward to define SLOs at the service boundary rather than at the infrastructure layer.

## Defining Your First SLO

Start with a clear, measurable objective:

```yaml
# SLO definition document
service: checkout
slo:
  name: availability
  target: 0.999        # 99.9%
  window: 30d
  indicator:
    metric: dapr_http_server_request_count
    good: status=~"2.."
    total: all
```

This translates to an error budget of 0.1% - approximately 43 minutes of downtime per month.

## Computing Error Budget with Prometheus

```bash
# Error budget remaining (fraction)
1 - (
  1 - (
    sum(rate(dapr_http_server_request_count{app_id="checkout",status=~"2.."}[30d]))
    /
    sum(rate(dapr_http_server_request_count{app_id="checkout"}[30d]))
  )
) / (1 - 0.999)
```

Set up a recording rule to make this efficient:

```yaml
groups:
- name: dapr-slo
  rules:
  - record: dapr:error_budget:checkout:availability
    expr: |
      1 - (
        1 - (
          sum(rate(dapr_http_server_request_count{app_id="checkout",status=~"2.."}[30d]))
          /
          sum(rate(dapr_http_server_request_count{app_id="checkout"}[30d]))
        )
      ) / (1 - 0.999)
```

## Multi-Window Alerting

Use multi-window burn rate alerts to detect SLO violations at different speeds:

```yaml
groups:
- name: dapr-slo-alerts
  rules:
  - alert: DaprSLOBudgetBurnRateFast
    expr: |
      (
        rate(dapr_http_server_request_count{app_id="checkout",status!~"2.."}[1h])
        /
        rate(dapr_http_server_request_count{app_id="checkout"}[1h])
      ) > 14.4 * (1 - 0.999)
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Checkout SLO burning at 14.4x rate"

  - alert: DaprSLOBudgetBurnRateSlow
    expr: |
      (
        rate(dapr_http_server_request_count{app_id="checkout",status!~"2.."}[6h])
        /
        rate(dapr_http_server_request_count{app_id="checkout"}[6h])
      ) > 6 * (1 - 0.999)
    for: 15m
    labels:
      severity: warning
```

## Latency SLO

Define a latency-based SLO alongside availability:

```bash
# Fraction of requests completing under 200ms
sum(rate(dapr_http_server_latency_bucket{app_id="checkout",le="200"}[5m]))
/
sum(rate(dapr_http_server_latency_count{app_id="checkout"}[5m]))
```

Alert when latency SLO is at risk:

```yaml
  - alert: DaprLatencySLOAtRisk
    expr: |
      histogram_quantile(0.99,
        sum by (le) (rate(dapr_http_server_latency_bucket{app_id="checkout"}[5m]))
      ) > 500
    for: 5m
    labels:
      severity: warning
```

## Visualizing SLOs in Grafana

Create a Grafana dashboard row per service with panels for:
- Error budget remaining (gauge)
- Burn rate over time (time series)
- SLI value vs. SLO target (stat panel)

```bash
# Apply Grafana dashboard via ConfigMap
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: dapr-slo-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  dapr-slo.json: |
    { "title": "Dapr SLO Dashboard", ... }
EOF
```

## Summary

Implementing SLOs for Dapr services requires defining clear SLI queries against sidecar metrics, computing error budgets, and setting up multi-window burn rate alerts. This structured approach gives engineering teams an objective, data-driven framework for reliability decisions - balancing new feature work against the remaining error budget.
