# How to Build a Chargeback Model for Observability Costs Using OpenTelemetry Resource Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, FinOps, Chargeback, Cost Management

Description: Build a chargeback model that attributes observability infrastructure costs to individual teams using OpenTelemetry resource attributes.

Observability is not free. Storage, compute, and network costs add up quickly, especially when some teams generate 100x more telemetry than others. A chargeback model uses OpenTelemetry resource attributes to track exactly how much telemetry each team produces and attributes the cost accordingly.

## The Problem

Without chargeback, you get a tragedy of the commons. Teams have no incentive to control their telemetry volume because the observability team absorbs all the costs. With chargeback, each team sees the cost of their observability data and can make informed decisions about sampling rates and retention.

## Step 1: Ensure Proper Attribution

Every piece of telemetry must have team and service ownership attributes:

```yaml
# collector-config.yaml
processors:
  resource:
    attributes:
      # These are set per-team in their namespace Collector
      - key: team.name
        value: ${env:TEAM_NAME}
        action: upsert
      - key: team.cost_center
        value: ${env:COST_CENTER}
        action: upsert
      - key: service.name
        from_attribute: service.name
        action: upsert
      - key: deployment.environment
        value: ${env:ENVIRONMENT}
        action: upsert
```

## Step 2: Collect Volume Metrics at the Gateway

Configure the gateway Collector to track telemetry volume per team:

```yaml
# gateway-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  # The count connector generates metrics from telemetry volume
  count:
    traces:
      spans.per.team:
        description: "Number of spans received per team"
        conditions:
          - 'attributes["team.name"] != ""'
        attributes:
          - key: team.name
          - key: service.name
          - key: deployment.environment

    logs:
      logs.per.team:
        description: "Number of log records per team"
        conditions:
          - 'resource.attributes["team.name"] != ""'
        attributes:
          - key: team.name
          - key: service.name

    metrics:
      datapoints.per.team:
        description: "Number of metric data points per team"
        conditions:
          - 'resource.attributes["team.name"] != ""'
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
    metrics:
      receivers: [otlp, count]
      processors: [batch]
      exporters: [otlphttp/backend, prometheus]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/backend, count]
```

## Step 3: Cost Calculation Engine

Build a service that queries volume metrics and calculates costs:

```python
# cost_calculator.py
import requests
from datetime import datetime, timedelta

PROMETHEUS_URL = "http://prometheus:9090"

# Cost per unit (adjust based on your actual costs)
COST_PER_SPAN = 0.0000005       # $0.50 per million spans
COST_PER_LOG = 0.0000003        # $0.30 per million log records
COST_PER_METRIC_POINT = 0.00001 # $10 per million data points
COST_PER_GB_STORAGE = 0.023     # S3 storage cost per GB/month

# Average sizes for storage estimation
AVG_SPAN_BYTES = 500
AVG_LOG_BYTES = 200
AVG_METRIC_BYTES = 50

def query_prometheus(query, start, end, step="1h"):
    """Query Prometheus for volume data."""
    resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query_range", params={
        "query": query,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "step": step,
    })
    return resp.json()["data"]["result"]

def calculate_team_costs(team_name, start_date, end_date):
    """Calculate observability costs for a team over a time period."""

    # Query span volume
    spans_data = query_prometheus(
        f'sum(increase(spans_per_team_total{{team_name="{team_name}"}}[1h]))',
        start_date, end_date
    )
    total_spans = sum(
        float(point[1]) for series in spans_data
        for point in series["values"]
    )

    # Query log volume
    logs_data = query_prometheus(
        f'sum(increase(logs_per_team_total{{team_name="{team_name}"}}[1h]))',
        start_date, end_date
    )
    total_logs = sum(
        float(point[1]) for series in logs_data
        for point in series["values"]
    )

    # Query metric data points
    metrics_data = query_prometheus(
        f'sum(increase(datapoints_per_team_total{{team_name="{team_name}"}}[1h]))',
        start_date, end_date
    )
    total_metrics = sum(
        float(point[1]) for series in metrics_data
        for point in series["values"]
    )

    # Calculate ingestion costs
    ingestion_cost = (
        total_spans * COST_PER_SPAN +
        total_logs * COST_PER_LOG +
        total_metrics * COST_PER_METRIC_POINT
    )

    # Calculate storage costs (monthly)
    storage_gb = (
        total_spans * AVG_SPAN_BYTES +
        total_logs * AVG_LOG_BYTES +
        total_metrics * AVG_METRIC_BYTES
    ) / (1024 ** 3)
    storage_cost = storage_gb * COST_PER_GB_STORAGE

    return {
        "team": team_name,
        "period_start": start_date.isoformat(),
        "period_end": end_date.isoformat(),
        "volumes": {
            "spans": int(total_spans),
            "logs": int(total_logs),
            "metric_points": int(total_metrics),
        },
        "costs": {
            "ingestion": round(ingestion_cost, 2),
            "storage": round(storage_cost, 2),
            "total": round(ingestion_cost + storage_cost, 2),
        }
    }

def generate_monthly_report():
    """Generate a cost report for all teams."""
    now = datetime.utcnow()
    start = now.replace(day=1, hour=0, minute=0, second=0)
    end = now

    # Get list of teams from Prometheus
    teams_data = requests.get(
        f"{PROMETHEUS_URL}/api/v1/label/team_name/values"
    ).json()
    teams = teams_data["data"]

    report = []
    for team in teams:
        costs = calculate_team_costs(team, start, end)
        report.append(costs)
        print(f"Team: {team}")
        print(f"  Spans: {costs['volumes']['spans']:,}")
        print(f"  Logs: {costs['volumes']['logs']:,}")
        print(f"  Cost: ${costs['costs']['total']:.2f}")
        print()

    return report

if __name__ == "__main__":
    generate_monthly_report()
```

## Step 4: Expose Costs in a Dashboard

Create Grafana panels that show per-team costs:

```sql
-- Grafana query: Daily cost by team (ClickHouse data source)
SELECT
    toDate(timestamp) as date,
    resource_attributes['team.name'] as team,
    count() * 0.0000005 as span_cost_usd
FROM otel_traces
WHERE timestamp > now() - INTERVAL 30 DAY
GROUP BY date, team
ORDER BY date, span_cost_usd DESC
```

## Wrapping Up

A chargeback model based on OpenTelemetry resource attributes creates transparency around observability costs. Teams see the direct cost of their telemetry decisions, which naturally drives better behavior: appropriate sampling rates, thoughtful metric cardinality, and reasonable log verbosity. The key is making cost data visible and actionable.
