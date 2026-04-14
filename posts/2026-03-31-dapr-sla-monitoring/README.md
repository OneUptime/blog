# How to Implement Dapr SLA Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SLA, SLO, Monitoring, Prometheus, Reliability

Description: Implement SLA monitoring for Dapr-based microservices by defining SLOs, calculating error budgets, and creating Prometheus recording rules for availability tracking.

---

SLA monitoring for Dapr deployments requires defining service level objectives (SLOs) for the metrics Dapr exposes, then tracking error budgets to ensure you are meeting your commitments to end users.

## Defining SLOs for Dapr Services

Common SLOs for Dapr-enabled services:

- **Availability**: 99.9% of service invocation requests return 2xx
- **Latency**: p99 request latency below 200ms
- **Pub/Sub Delivery**: 99.95% of published messages are delivered within 30 seconds

## Prometheus Recording Rules for SLOs

Create recording rules to efficiently compute SLO metrics over time windows:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-slo-recording-rules
  namespace: monitoring
spec:
  groups:
  - name: dapr.slo.availability
    interval: 30s
    rules:
    - record: job:dapr_service_invocation_success:rate5m
      expr: |
        sum(rate(dapr_runtime_service_invocation_req_sent_total{
          status=~"2.."
        }[5m])) by (app_id)
        /
        sum(rate(dapr_runtime_service_invocation_req_sent_total[5m])) by (app_id)

    - record: job:dapr_service_invocation_success:rate1h
      expr: |
        sum(rate(dapr_runtime_service_invocation_req_sent_total{
          status=~"2.."
        }[1h])) by (app_id)
        /
        sum(rate(dapr_runtime_service_invocation_req_sent_total[1h])) by (app_id)
```

## Error Budget Calculation

Calculate remaining error budget as a percentage:

```bash
# SLO target: 99.9% availability over 30 days
# Total minutes in 30 days = 43200
# Allowed downtime minutes = 43200 * 0.001 = 43.2 minutes

# PromQL: error budget remaining
1 - (
  (1 - avg_over_time(job:dapr_service_invocation_success:rate5m[30d]))
  /
  (1 - 0.999)
)
```

## Grafana SLO Dashboard

Create a Grafana panel to visualize SLO compliance:

```json
{
  "type": "gauge",
  "title": "30-Day Availability SLO",
  "targets": [
    {
      "expr": "avg_over_time(job:dapr_service_invocation_success:rate1h[30d]) * 100",
      "legendFormat": "{{ app_id }}"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "thresholds": {
        "steps": [
          {"color": "red", "value": 0},
          {"color": "yellow", "value": 99.5},
          {"color": "green", "value": 99.9}
        ]
      }
    }
  }
}
```

## Latency SLO Tracking

Track p99 latency against the SLO target:

```yaml
- record: job:dapr_invocation_latency_p99:rate5m
  expr: |
    histogram_quantile(0.99,
      sum(rate(dapr_grpc_io_server_server_latency_bucket[5m])) by (app_id, le)
    )

- alert: DaprLatencySLOBreach
  expr: |
    job:dapr_invocation_latency_p99:rate5m > 200
  for: 5m
  annotations:
    summary: "Latency SLO breach for {{ $labels.app_id }}"
```

## Weekly SLA Reports

Generate a weekly SLA report using Grafana snapshots or a script:

```bash
#!/bin/bash
# Query 7-day availability from Prometheus
PROM_URL="http://prometheus:9090"
QUERY='avg_over_time(job:dapr_service_invocation_success:rate1h[7d]) * 100'

curl -s "$PROM_URL/api/v1/query" \
  --data-urlencode "query=$QUERY" | \
  jq '.data.result[] | {app: .metric.app_id, availability: .value[1]}'
```

## Summary

Dapr SLA monitoring uses Prometheus recording rules to efficiently compute availability and latency SLOs, error budget dashboards to track remaining budget, and automated alerts when SLOs are at risk. Weekly SLA reports generated from recorded metrics provide the data needed for SLA commitments with stakeholders.
