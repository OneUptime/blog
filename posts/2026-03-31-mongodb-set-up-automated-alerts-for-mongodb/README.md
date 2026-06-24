# How to Set Up Automated Alerts for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Alert

Description: Set up automated alerts for MongoDB using mongostat, Prometheus, and alerting rules to catch performance issues before they impact your users.

---

## Why Automated Alerts Matter

MongoDB issues like replication lag, connection pool exhaustion, and slow queries rarely announce themselves. By the time users notice, the damage is done. Automated alerts catch these conditions early, giving you time to respond before they escalate into outages.

## Key Metrics to Alert On

Before writing rules, identify what matters most:

```text
- Replication lag > 10 seconds
- Connection count > 80% of maxIncomingConnections
- Cache dirty bytes > 20% of cache size
- Oplog window < 24 hours
- Replication state != PRIMARY or SECONDARY
- Query execution time > 100ms (slow query log)
- Disk utilization > 85%
```

## Prometheus and MongoDB Exporter

Install the MongoDB Prometheus exporter:

```bash
docker run -d \
  --name mongodb-exporter \
  -p 9216:9216 \
  percona/mongodb_exporter:0.40 \
  --mongodb.uri="mongodb://monitor:password@localhost:27017" \
  --collect-all
```

## Prometheus Alerting Rules

Create `/etc/prometheus/rules/mongodb.yml`:

```yaml
groups:
  - name: mongodb
    rules:
      - alert: MongoDBReplicationLag
        expr: mongodb_mongod_replset_member_replication_lag > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB replication lag is high"
          description: "Replica {{ $labels.member }} has {{ $value }}s lag"

      - alert: MongoDBConnectionsHigh
        expr: |
          mongodb_ss_connections{conn_type="current"} /
          (mongodb_ss_connections{conn_type="current"} + mongodb_ss_connections{conn_type="available"}) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB connection usage above 80%"

      - alert: MongoDBCacheDirtyHigh
        expr: |
          mongodb_ss_wt_cache_bytes_dirty /
          mongodb_ss_wt_cache_max_bytes > 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "WiredTiger cache dirty ratio exceeds 20%"

      - alert: MongoDBNodeNotHealthy
        expr: mongodb_mongod_replset_member_health != 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB replica set member is unhealthy"
```

## Alertmanager Routing

Configure Alertmanager to route MongoDB alerts to the on-call team:

```yaml
route:
  group_by: ['alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - matchers:
        - alertname="MongoDBNodeNotHealthy"
      receiver: pagerduty-critical
    - matchers:
        - alertname="MongoDBReplicationLag"
      receiver: pagerduty-critical
    - matchers:
        - severity="warning"
      receiver: slack-warnings

receivers:
  - name: pagerduty-critical
    pagerduty_configs:
      - routing_key: YOUR_PD_ROUTING_KEY
  - name: slack-warnings
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK'
        channel: '#mongodb-alerts'
```

## Testing Alerts

Trigger a test alert manually to verify routing works:

```bash
curl -X POST http://localhost:9093/api/v2/alerts \
  -H 'Content-Type: application/json' \
  -d '[{
    "labels": {"alertname": "MongoDBTestAlert", "severity": "warning"},
    "annotations": {"summary": "Test alert from MongoDB monitoring setup"}
  }]'
```

## Summary

Automated MongoDB alerting requires three components working together: a metrics exporter (mongodb_exporter), a time-series database (Prometheus), and an alerting router (Alertmanager). Focus your alert rules on actionable metrics - replication lag, connection saturation, and node health - to avoid alert fatigue. Test your routing before you need it, and connect alerts to your incident response workflow to ensure fast response times.
