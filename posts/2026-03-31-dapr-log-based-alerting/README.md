# How to Implement Log-Based Alerting for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Alerting, Logging, Observability, Monitoring

Description: Learn how to implement log-based alerting for Dapr microservices using Grafana Loki, Elasticsearch Watcher, and CloudWatch log metric filters to detect failures.

---

## Overview

Log-based alerting catches failure conditions in Dapr microservices that metrics alone miss - such as specific error messages, circuit breaker trips, or authentication failures. By defining alert rules against your log stream, you get notified when important events occur in your Dapr services.

## Log-Based Alerting with Grafana Loki

Grafana supports LogQL-based alert rules that fire when log patterns match:

```yaml
apiVersion: 1
groups:
  - name: dapr-log-alerts
    folder: Dapr
    interval: 1m
    rules:
      - uid: dapr-circuit-breaker-alert
        title: Dapr Circuit Breaker Opened
        condition: A
        data:
          - refId: A
            queryType: range
            relativeTimeRange:
              from: 300
              to: 0
            datasourceUid: loki-datasource
            model:
              expr: |
                count_over_time(
                  {job="dapr-containers"} |= "circuit breaker" |= "open" [5m]
                )
              maxLines: 1000
        noDataState: NoData
        execErrState: Alerting
        for: 0s
        annotations:
          summary: "Dapr circuit breaker opened"
          description: "Circuit breaker opened in Dapr service - check dependencies"
        labels:
          severity: warning
          team: platform
```

## Alerting on Dapr Error Rate with Loki

Create a threshold alert when the error rate exceeds 5 errors per minute:

```yaml
- uid: dapr-error-rate-alert
  title: High Dapr Error Rate
  condition: A
  data:
    - refId: A
      datasourceUid: loki-datasource
      model:
        expr: |
          sum(rate({job="dapr-containers", level="error"}[1m])) > 0.083
  for: 2m
  annotations:
    summary: "Dapr error rate exceeds threshold"
    runbook: "https://wiki.example.com/dapr/runbooks/high-error-rate"
```

## Elasticsearch Watcher for Log Alerts

Use Elasticsearch Watcher to alert on error patterns in Dapr logs:

```bash
curl -X PUT "http://elasticsearch:9200/_watcher/watch/dapr-auth-failure" \
  -H "Content-Type: application/json" \
  -d '{
    "trigger": {
      "schedule": { "interval": "5m" }
    },
    "input": {
      "search": {
        "request": {
          "indices": ["dapr-logs-*"],
          "body": {
            "size": 0,
            "query": {
              "bool": {
                "filter": [
                  { "term": { "level": "error" } },
                  { "match": { "msg": "unauthorized" } },
                  { "range": { "@timestamp": { "gte": "now-5m" } } }
                ]
              }
            }
          }
        }
      }
    },
    "condition": {
      "compare": { "ctx.payload.hits.total.value": { "gt": 5 } }
    },
    "actions": {
      "notify_slack": {
        "webhook": {
          "scheme": "https",
          "host": "hooks.slack.com",
          "path": "/services/YOUR/SLACK/WEBHOOK",
          "method": "post",
          "body": "{\"text\": \"High Dapr auth failure rate: {{ctx.payload.hits.total.value}} errors in last 5 minutes\"}"
        }
      }
    }
  }'
```

## CloudWatch Log Metric Filters and Alarms

On AWS, convert log patterns into CloudWatch metrics for alerting:

```bash
# Create metric filter for Dapr resiliency activations
aws logs put-metric-filter \
  --log-group-name /eks/dapr/sidecar-logs \
  --filter-name DaprResiliencyActivations \
  --filter-pattern '{ $.msg = "Resiliency policy*" }' \
  --metric-transformations \
    metricName=ResiliencyActivations,metricNamespace=Dapr,metricValue=1,unit=Count

# Create alarm on metric
aws cloudwatch put-metric-alarm \
  --alarm-name DaprHighResiliencyRate \
  --metric-name ResiliencyActivations \
  --namespace Dapr \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123:dapr-alerts-topic
```

## Alerting on Specific Dapr Service Errors

Focus alerts on a particular service to reduce alert fatigue:

```yaml
# Loki alert scoped to payment service
expr: |
  count_over_time(
    {job="dapr-containers", app_id="payment-service", level="error"}[5m]
  ) > 3
```

## Alert Routing with Grafana Alertmanager

Route Dapr alerts to different channels based on severity:

```yaml
route:
  group_by: [app_id, severity]
  receiver: default
  routes:
    - match:
        severity: critical
      receiver: pagerduty
    - match:
        severity: warning
        team: platform
      receiver: slack-platform
```

## Summary

Log-based alerting for Dapr microservices provides detection of specific error conditions, circuit breaker trips, and authentication failures that metric-based alerts might miss. Grafana Loki alert rules, Elasticsearch Watcher, and CloudWatch metric filters each offer practical solutions for turning log patterns into actionable notifications. Scope alerts to specific services and severity levels to minimize alert fatigue.
