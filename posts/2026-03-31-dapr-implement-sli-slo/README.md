# How to Implement SLI/SLO for Dapr Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SLI, SLO, Reliability, Prometheus

Description: Define and measure Service Level Indicators and Service Level Objectives for Dapr-based microservices using Prometheus metrics and recording rules.

---

SLIs (Service Level Indicators) are the metrics you measure. SLOs (Service Level Objectives) are the targets you set. For Dapr services, Prometheus metrics provide ready-made SLI data: request success rates, latency percentiles, and availability. This guide walks through defining meaningful SLIs and SLOs for Dapr microservices.

## Choosing SLIs for Dapr Services

Good SLIs measure what users care about. For Dapr service invocation, the most useful SLIs are:

| SLI | Measurement | Target |
|-----|-------------|--------|
| Availability | % requests not returning 5xx | 99.9% |
| Latency | % requests completing under 500ms | 95% |
| Pub/Sub delivery | % messages successfully delivered | 99.5% |
| State store reliability | % state ops succeeding | 99.9% |

## Defining SLI Recording Rules

Create recording rules to precompute SLIs efficiently:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-sli-recording-rules
  namespace: monitoring
spec:
  groups:
    - name: dapr.sli.availability
      interval: 30s
      rules:
        - record: dapr:sli:request_success_rate_5m
          expr: |
            sum(rate(dapr_http_server_request_count{status!~"5.."}[5m])) by (app_id)
            /
            sum(rate(dapr_http_server_request_count[5m])) by (app_id)

        - record: dapr:sli:request_success_rate_1h
          expr: |
            sum(rate(dapr_http_server_request_count{status!~"5.."}[1h])) by (app_id)
            /
            sum(rate(dapr_http_server_request_count[1h])) by (app_id)

        - record: dapr:sli:latency_p99_5m
          expr: |
            histogram_quantile(0.99,
              sum(rate(dapr_http_server_latency_bucket[5m]))
              by (app_id, le)
            )

        - record: dapr:sli:latency_under_500ms_ratio
          expr: |
            sum(rate(dapr_http_server_latency_bucket{le="500"}[5m])) by (app_id)
            /
            sum(rate(dapr_http_server_latency_count[5m])) by (app_id)
```

## SLO Alerting with Error Budget Burn Rate

Alert when SLO error budget is burning too fast:

```yaml
    - name: dapr.slo.burn.rates
      rules:
        - alert: DaprSLOAvailabilityBurnRateFast
          expr: |
            (
              1 - dapr:sli:request_success_rate_1h
            ) > (14.4 * (1 - 0.999))
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Dapr SLO error budget burning fast"
            description: "App {{ $labels.app_id }} consuming error budget 14x faster than sustainable rate. SLO at risk within 1 hour."

        - alert: DaprSLOLatencyBurnRateFast
          expr: |
            (
              1 - dapr:sli:latency_under_500ms_ratio
            ) > (14.4 * (1 - 0.95))
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "Dapr latency SLO burning error budget rapidly"
            description: "App {{ $labels.app_id }} latency SLO error budget at high consumption rate."
```

## Calculating Remaining Error Budget

Track error budget remaining as a Prometheus metric:

```promql
# Error budget remaining (30-day window, 99.9% availability SLO)
(
  avg_over_time(dapr:sli:request_success_rate_5m[30d]) - 0.999
) / (1 - 0.999)
```

## Visualizing SLOs in Grafana

Create a Grafana dashboard with:

```promql
# Current availability (stat panel)
avg(dapr:sli:request_success_rate_5m{app_id="checkout-service"})

# 30-day error budget burn (gauge)
(avg_over_time(dapr:sli:request_success_rate_1h{app_id="checkout-service"}[30d]) - 0.999) / (1 - 0.999)

# Latency SLO compliance (time series)
dapr:sli:latency_under_500ms_ratio{app_id="checkout-service"}
```

## Summary

Implementing SLIs and SLOs for Dapr services involves defining availability and latency indicators using Prometheus recording rules, then alerting on error budget burn rates rather than raw thresholds. Multi-window burn rate alerts provide early warning of SLO risk while avoiding alert fatigue from transient spikes.
