# How to Monitor Error Budget Consumption Rate in Real Time with OpenTelemetry Metrics and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Error Budget, Grafana, SRE

Description: Monitor error budget consumption in real time using OpenTelemetry metrics exported to Prometheus and visualized in Grafana.

Knowing your error budget exists is not enough. You need to see it burning in real time so you can react before it is gone. This post walks through building a real-time error budget monitoring dashboard in Grafana using OpenTelemetry metrics. You will be able to see exactly how much budget remains, how fast it is being consumed, and when you need to freeze deployments to protect reliability.

## Architecture Overview

The data flow looks like this:

```
Application (OTel SDK) -> OTel Collector (spanmetrics connector) -> Prometheus -> Grafana
```

The OpenTelemetry Collector converts span data into metrics. Prometheus stores and queries those metrics. Grafana displays them on a dashboard that your team monitors.

## Collector Configuration for Span Metrics

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  spanmetrics:
    dimensions:
      - name: service.name
      - name: http.route
      - name: http.method
      - name: http.status_code
    metrics_flush_interval: 15s

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: "otel"
  otlp/traces:
    endpoint: "tempo:4317"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [spanmetrics, otlp/traces]
    metrics:
      receivers: [spanmetrics]
      exporters: [prometheus]
```

## Prometheus Recording Rules

Pre-compute the error budget metrics so dashboard queries stay fast:

```yaml
# prometheus-rules.yaml
groups:
  - name: error_budget
    interval: 30s
    rules:
      # Total request rate by service
      - record: slo:requests:rate5m
        expr: |
          sum by (service_name) (
            rate(otel_traces_spanmetrics_calls_total[5m])
          )

      # Error request rate by service
      - record: slo:errors:rate5m
        expr: |
          sum by (service_name) (
            rate(otel_traces_spanmetrics_calls_total{
              status_code="STATUS_CODE_ERROR"
            }[5m])
          )

      # Error ratio (0 to 1)
      - record: slo:error_ratio:5m
        expr: |
          slo:errors:rate5m / slo:requests:rate5m

      # 30-day error budget consumed (percentage)
      - record: slo:budget_consumed:30d
        expr: |
          (
            sum by (service_name) (
              increase(otel_traces_spanmetrics_calls_total{
                status_code="STATUS_CODE_ERROR"
              }[30d])
            )
            /
            (
              sum by (service_name) (
                increase(otel_traces_spanmetrics_calls_total[30d])
              )
              * 0.001
            )
          )

      # Burn rate (how fast budget is being consumed relative to sustainable rate)
      - record: slo:burn_rate:1h
        expr: |
          (slo:error_ratio:5m) / 0.001
```

## Grafana Dashboard Panels

### Panel 1: Error Budget Remaining (Gauge)

This is the centerpiece of the dashboard. A big gauge that shows how much budget is left.

```json
{
  "title": "Error Budget Remaining",
  "type": "gauge",
  "targets": [
    {
      "expr": "clamp_min(100 - (slo:budget_consumed:30d{service_name=\"api-gateway\"} * 100), 0)",
      "legendFormat": "Budget Remaining %"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "min": 0,
      "max": 100,
      "unit": "percent",
      "thresholds": {
        "steps": [
          { "value": 0, "color": "red" },
          { "value": 25, "color": "orange" },
          { "value": 50, "color": "yellow" },
          { "value": 75, "color": "green" }
        ]
      }
    }
  }
}
```

### Panel 2: Burn Rate Over Time (Time Series)

Shows how the burn rate changes over time. A burn rate above 1.0 means you are consuming budget faster than sustainable.

```promql
# Burn rate over time
slo:burn_rate:1h{service_name="api-gateway"}
```

Add threshold lines at 1.0 (sustainable limit) and 14.4 (fast-burn alert threshold) for visual reference.

### Panel 3: Error Budget Consumption Timeline

This shows cumulative budget consumption over the 30-day window:

```promql
# Cumulative errors as a percentage of the budget
sum(increase(otel_traces_spanmetrics_calls_total{
  service_name="api-gateway",
  status_code="STATUS_CODE_ERROR"
}[30d]))
/
(sum(increase(otel_traces_spanmetrics_calls_total{
  service_name="api-gateway"
}[30d])) * 0.001)
* 100
```

### Panel 4: Time Until Budget Exhaustion

This answers "if the current burn rate continues, when will we run out?"

```promql
# Hours until budget is exhausted at current burn rate
(
  clamp_min(
    100 - (slo:budget_consumed:30d{service_name="api-gateway"} * 100),
    0
  )
  /
  clamp_min(slo:burn_rate:1h{service_name="api-gateway"}, 0.001)
)
* 720 / 100
```

Display this as a stat panel with a unit of "hours."

### Panel 5: Error Rate by Endpoint (Table)

Break down which endpoints are consuming the most budget:

```promql
# Error rate by route, sorted by impact
topk(10,
  sum by (http_route) (
    rate(otel_traces_spanmetrics_calls_total{
      service_name="api-gateway",
      status_code="STATUS_CODE_ERROR"
    }[1h])
  )
  /
  sum by (http_route) (
    rate(otel_traces_spanmetrics_calls_total{
      service_name="api-gateway"
    }[1h])
  )
)
```

## Adding Annotations for Context

Mark deployments, incidents, and feature flags on the dashboard so you can correlate budget consumption with changes:

```python
# annotate_grafana.py - Add deployment annotations to Grafana
import requests
import time

def annotate_deployment(grafana_url, api_key, service, version):
    """Add a deployment annotation to the error budget dashboard."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "time": int(time.time() * 1000),
        "tags": ["deployment", service],
        "text": f"Deployed {service} v{version}",
    }

    requests.post(
        f"{grafana_url}/api/annotations",
        json=payload,
        headers=headers,
    )
```

## Setting Up Alerts from the Dashboard

Configure Grafana alerts directly on the dashboard panels:

- **Budget below 50%**: Warning notification to Slack.
- **Budget below 25%**: Alert to the engineering lead to consider a deployment freeze.
- **Budget below 10%**: Page the on-call SRE.
- **Burn rate above 14.4x**: Immediate page, something is actively broken.

## Practical Usage

This dashboard becomes the go/no-go signal for deployments. Before deploying a new release:

1. Check the error budget remaining. If it is below 25%, delay the deploy.
2. After deploying, watch the burn rate panel. If it spikes, roll back.
3. During incidents, use the endpoint breakdown to identify which routes are burning budget fastest.

## Conclusion

Real-time error budget monitoring with OpenTelemetry and Grafana gives your team a single source of truth for reliability. Instead of arguing about whether the system is "stable enough" for a deploy, you look at the dashboard. The budget is either healthy or it is not. This turns reliability from a subjective assessment into a measurable, trackable metric.
