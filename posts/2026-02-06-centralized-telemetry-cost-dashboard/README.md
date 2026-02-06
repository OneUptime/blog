# How to Build a Centralized Telemetry Cost Dashboard That Shows Per-Team, Per-Service Observability Spend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cost Dashboard, FinOps, Observability Spend

Description: Build a centralized dashboard that shows per-team and per-service observability costs derived from OpenTelemetry telemetry volume data.

If you cannot see the cost, you cannot manage it. A centralized telemetry cost dashboard gives every team visibility into their observability spend, broken down by signal type, service, and time period. This post shows how to build one using data already available in your OpenTelemetry pipeline.

## Data Sources for Cost Calculation

Telemetry costs come from three components:

1. **Ingestion**: Cost per span, log record, or metric data point processed.
2. **Storage**: Cost per GB stored, varies by retention period.
3. **Query**: Cost per query or per GB scanned (depends on your backend).

We can derive all of these from volume metrics that the Collector and backend already produce.

## Collecting Volume Metrics

Configure the Collector gateway to emit volume metrics per team and service:

```yaml
# gateway-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  count:
    traces:
      spans.total:
        description: "Total spans received"
        attributes:
          - key: team.name
          - key: service.name
          - key: deployment.environment

      spans.bytes:
        description: "Total span bytes received"
        attributes:
          - key: team.name
          - key: service.name

    logs:
      logs.total:
        description: "Total log records received"
        attributes:
          - key: team.name
          - key: service.name

    metrics:
      datapoints.total:
        description: "Total metric data points received"
        attributes:
          - key: team.name
          - key: service.name

processors:
  batch:
    send_batch_size: 8192
    timeout: 2s

exporters:
  otlphttp/backend:
    endpoint: https://backend:4318

  prometheus:
    endpoint: 0.0.0.0:8889
    resource_to_telemetry_conversion:
      enabled: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/backend, count]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/backend, count]
    metrics/volume:
      receivers: [count]
      processors: [batch]
      exporters: [prometheus]
    metrics/passthrough:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/backend, count]
```

## Prometheus Recording Rules for Cost

```yaml
# cost-recording-rules.yaml
groups:
  - name: telemetry-costs
    interval: 5m
    rules:
      # Ingestion cost per team per hour (spans)
      - record: telemetry:cost:ingestion:spans:per_hour
        expr: |
          sum by (team_name, service_name) (
            increase(spans_total[1h])
          ) * 0.0000005

      # Ingestion cost per team per hour (logs)
      - record: telemetry:cost:ingestion:logs:per_hour
        expr: |
          sum by (team_name, service_name) (
            increase(logs_total[1h])
          ) * 0.0000003

      # Ingestion cost per team per hour (metrics)
      - record: telemetry:cost:ingestion:metrics:per_hour
        expr: |
          sum by (team_name, service_name) (
            increase(datapoints_total[1h])
          ) * 0.00001

      # Total cost per team per hour
      - record: telemetry:cost:total:per_hour
        expr: |
          sum by (team_name) (
            telemetry:cost:ingestion:spans:per_hour
            + telemetry:cost:ingestion:logs:per_hour
            + telemetry:cost:ingestion:metrics:per_hour
          )

      # Projected monthly cost per team
      - record: telemetry:cost:projected:monthly
        expr: |
          telemetry:cost:total:per_hour * 24 * 30

      # Storage cost estimate (based on average sizes)
      - record: telemetry:cost:storage:monthly
        expr: |
          (
            sum by (team_name) (increase(spans_total[30d])) * 500
            + sum by (team_name) (increase(logs_total[30d])) * 200
            + sum by (team_name) (increase(datapoints_total[30d])) * 50
          ) / (1024 * 1024 * 1024) * 0.023
```

## Grafana Dashboard Definition

Create the dashboard using Terraform (or import directly into Grafana):

```json
{
  "dashboard": {
    "title": "Telemetry Cost Dashboard",
    "tags": ["finops", "observability", "cost"],
    "time": {"from": "now-30d", "to": "now"},
    "panels": [
      {
        "title": "Total Monthly Observability Spend",
        "type": "stat",
        "gridPos": {"h": 4, "w": 6, "x": 0, "y": 0},
        "targets": [{
          "expr": "sum(telemetry:cost:projected:monthly)",
          "legendFormat": "Projected Monthly"
        }],
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD",
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 10000},
                {"color": "red", "value": 25000}
              ]
            }
          }
        }
      },
      {
        "title": "Cost by Team (Monthly Projected)",
        "type": "piechart",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 4},
        "targets": [{
          "expr": "sum by (team_name) (telemetry:cost:projected:monthly)",
          "legendFormat": "{{team_name}}"
        }],
        "fieldConfig": {
          "defaults": {"unit": "currencyUSD"}
        }
      },
      {
        "title": "Cost Trend by Team (Daily)",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 4},
        "targets": [{
          "expr": "sum by (team_name) (telemetry:cost:total:per_hour) * 24",
          "legendFormat": "{{team_name}}"
        }],
        "fieldConfig": {
          "defaults": {"unit": "currencyUSD"}
        }
      },
      {
        "title": "Top 10 Most Expensive Services",
        "type": "bargauge",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 12},
        "targets": [{
          "expr": "topk(10, sum by (service_name) (telemetry:cost:projected:monthly))",
          "legendFormat": "{{service_name}}"
        }],
        "fieldConfig": {
          "defaults": {"unit": "currencyUSD"}
        }
      },
      {
        "title": "Cost Breakdown by Signal Type",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 12},
        "targets": [
          {
            "expr": "sum(telemetry:cost:ingestion:spans:per_hour) * 24",
            "legendFormat": "Traces"
          },
          {
            "expr": "sum(telemetry:cost:ingestion:logs:per_hour) * 24",
            "legendFormat": "Logs"
          },
          {
            "expr": "sum(telemetry:cost:ingestion:metrics:per_hour) * 24",
            "legendFormat": "Metrics"
          }
        ],
        "fieldConfig": {
          "defaults": {"unit": "currencyUSD"}
        }
      },
      {
        "title": "Volume by Team (Spans/sec)",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 20},
        "targets": [{
          "expr": "sum by (team_name) (rate(spans_total[5m]))",
          "legendFormat": "{{team_name}}"
        }]
      },
      {
        "title": "Budget vs Actual by Team",
        "type": "table",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 20},
        "targets": [
          {
            "expr": "sum by (team_name) (telemetry:cost:projected:monthly)",
            "legendFormat": "{{team_name}}",
            "instant": true
          }
        ],
        "transformations": [
          {
            "id": "organize",
            "options": {
              "renameByName": {
                "Value": "Projected Cost ($)",
                "team_name": "Team"
              }
            }
          }
        ]
      }
    ]
  }
}
```

## Automated Cost Reports

Send weekly cost reports to team leads:

```python
# weekly_cost_report.py
import requests
import json
from datetime import datetime

PROMETHEUS_URL = "http://prometheus:9090"
SLACK_WEBHOOK = "https://hooks.slack.com/services/xxx"

def get_team_costs():
    """Get projected monthly cost per team."""
    resp = requests.get(
        f"{PROMETHEUS_URL}/api/v1/query",
        params={
            "query": 'sum by (team_name) (telemetry:cost:projected:monthly)'
        }
    )
    results = resp.json()["data"]["result"]
    costs = {}
    for r in results:
        team = r["metric"]["team_name"]
        cost = float(r["value"][1])
        costs[team] = round(cost, 2)
    return costs

def send_report():
    costs = get_team_costs()
    total = sum(costs.values())

    # Sort by cost descending
    sorted_costs = sorted(costs.items(), key=lambda x: x[1], reverse=True)

    lines = [
        f"*Weekly Observability Cost Report - {datetime.now().strftime('%Y-%m-%d')}*",
        f"Total projected monthly spend: *${total:,.2f}*",
        "",
        "| Team | Projected Monthly Cost |",
        "|------|----------------------|",
    ]

    for team, cost in sorted_costs:
        lines.append(f"| {team} | ${cost:,.2f} |")

    message = "\n".join(lines)
    requests.post(SLACK_WEBHOOK, json={
        "text": message,
        "mrkdwn": True,
    })
    print(f"Report sent. Total projected: ${total:,.2f}")

if __name__ == "__main__":
    send_report()
```

## Cost Optimization Recommendations

The dashboard should also surface actionable recommendations:

```yaml
# Prometheus alert rules for cost optimization
groups:
  - name: cost-optimization
    rules:
      - alert: HighCardinalityMetric
        expr: |
          count by (team_name, service_name, __name__) (
            {__name__=~".*"}
          ) > 10000
        for: 1h
        annotations:
          summary: "High cardinality metric detected for {{ $labels.team_name }}"
          recommendation: "Review metric labels to reduce cardinality"

      - alert: ExcessiveLogVolume
        expr: |
          sum by (team_name, service_name) (
            rate(logs_total[1h])
          ) > 10000
        for: 30m
        annotations:
          summary: "{{ $labels.service_name }} generating >10k logs/sec"
          recommendation: "Review log levels and consider sampling debug logs"
```

## Wrapping Up

A centralized telemetry cost dashboard turns observability spending from an opaque infrastructure cost into a visible, attributable expense. When teams can see exactly how much their telemetry costs and compare it to their budget, they naturally make better decisions about what to instrument, how to sample, and when to reduce verbosity. The combination of Collector-level volume metrics, Prometheus recording rules for cost calculation, and a Grafana dashboard for visualization gives you everything you need to bring FinOps to observability.
