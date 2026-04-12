# How to Set Up MongoDB Alerts in Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Grafana, Alert, Prometheus, Monitoring

Description: Configure Grafana alerting for MongoDB using Prometheus metrics to detect connection exhaustion, replication lag, and performance degradation.

---

## Introduction

Grafana's alerting engine, combined with Prometheus MongoDB metrics, enables proactive notifications when your database is under stress. This guide covers creating alert rules for the most critical MongoDB signals: connection usage, replication lag, operation throughput, and cache pressure.

## Prerequisites

- MongoDB Exporter running and scraping to Prometheus
- Grafana 9+ with Prometheus as a data source
- A notification channel (Slack, PagerDuty, email, etc.)

## Configuring a Contact Point

In Grafana, navigate to Alerting - Contact Points and create a Slack webhook:

```json
{
  "name": "mongodb-ops-slack",
  "type": "slack",
  "settings": {
    "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "recipient": "#mongodb-alerts",
    "title": "MongoDB Alert: {{ .GroupLabels.alertname }}",
    "text": "{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}"
  }
}
```

## Alert Rule: High Connection Count

```yaml
# alert_rules.yaml (Grafana Unified Alerting via API or provisioning)
apiVersion: 1
groups:
  - orgId: 1
    name: MongoDB Alerts
    folder: MongoDB
    interval: 1m
    rules:
      - uid: mongodb-high-connections
        title: MongoDB High Connection Count
        condition: C
        data:
          - refId: A
            datasourceUid: prometheus
            model:
              expr: mongodb_connections{state="current"}
              instant: true
          - refId: C
            datasourceUid: __expr__
            model:
              type: threshold
              conditions:
                - evaluator:
                    params: [800]
                    type: gt
                  query:
                    params: [A]
        noDataState: NoData
        execErrState: Error
        for: 5m
        annotations:
          summary: "MongoDB connection count is {{ $values.A.Value }} (threshold: 800)"
        labels:
          severity: warning
```

## Alert Rule: Replication Lag

```promql
# Replication lag in seconds per secondary member (percona/mongodb_exporter compatible mode)
mongodb_mongod_replset_member_replication_lag > 30
```

Configure this as a Grafana alert with a 5-minute evaluation window and a critical severity label.

## Alert Rule: WiredTiger Cache Pressure

```promql
(
  mongodb_mongod_wiredtiger_cache_bytes{type="total"}
  / mongodb_mongod_wiredtiger_cache_max_bytes
) * 100 > 90
```

## Alert Rule: MongoDB Instance Down

```promql
mongodb_up == 0
```

Set `for: 1m` - this fires almost immediately when the exporter loses connectivity.

## Silencing Alerts During Maintenance

```bash
# Create a silence via the Grafana API
curl -X POST http://grafana:3000/api/alertmanager/grafana/api/v2/silences \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [{"name": "alertname", "value": "MongoDB.*", "isRegex": true}],
    "startsAt": "2026-03-31T02:00:00Z",
    "endsAt": "2026-03-31T04:00:00Z",
    "comment": "Scheduled maintenance window",
    "createdBy": "ops-team"
  }'
```

## Summary

Effective MongoDB alerting in Grafana starts with the four core signals: instance availability, connection count, replication lag, and WiredTiger cache utilization. Use Grafana's Unified Alerting with Prometheus expressions, set appropriate evaluation windows to avoid alert flapping, and configure silence rules for planned maintenance. Link alerts to a contact point and enable notification routing so critical alerts page on-call engineers immediately.
