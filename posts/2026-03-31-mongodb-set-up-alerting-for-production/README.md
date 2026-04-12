# How to Set Up MongoDB Alerting for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Alerting, Monitoring, Production, Atlas

Description: Learn how to set up comprehensive MongoDB alerting for production covering replica set health, slow queries, connection limits, disk usage, and replication lag.

---

## Critical Alerts Every MongoDB Deployment Needs

Production MongoDB deployments need alerts in five categories:
- **Availability** - primary elections, member state changes
- **Performance** - slow operations, high query execution times
- **Capacity** - disk usage, connection pool exhaustion
- **Replication** - replication lag, oplog window
- **Security** - authentication failures, unauthorized access attempts

## Step 1: Configure Atlas Alert Policies via API

Set up alerts in MongoDB Atlas using the Admin API:

```bash
BASE_URL="https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/alertConfigs"
AUTH="-u PUBLIC_KEY:PRIVATE_KEY --digest"
ACCEPT="Accept: application/vnd.atlas.2025-01-01+json"

# Alert: Primary election occurred
curl $AUTH -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "$ACCEPT" \
  -d '{
    "eventTypeName": "PRIMARY_ELECTED",
    "enabled": true,
    "notifications": [{
      "typeName": "EMAIL",
      "emailEnabled": true,
      "emailAddress": "ops@example.com",
      "intervalMin": 5,
      "delayMin": 0
    }]
  }'
```

## Step 2: Disk Usage Alert

Alert when disk approaches capacity:

```bash
# Alert at 75% disk usage
curl $AUTH -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "$ACCEPT" \
  -d '{
    "eventTypeName": "OUTSIDE_METRIC_THRESHOLD",
    "enabled": true,
    "metricThreshold": {
      "metricName": "DISK_PARTITION_SPACE_USED_DATA",
      "operator": "GREATER_THAN",
      "threshold": 75,
      "units": "RAW",
      "mode": "AVERAGE"
    },
    "notifications": [{
      "typeName": "EMAIL",
      "emailEnabled": true,
      "emailAddress": "ops@example.com",
      "intervalMin": 60,
      "delayMin": 5
    }]
  }'
```

## Step 3: Oplog Window Alert

Alert when the oplog window is running low:

```bash
# Alert when oplog window drops below 1 hour
curl $AUTH -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "$ACCEPT" \
  -d '{
    "eventTypeName": "REPLICATION_OPLOG_WINDOW_RUNNING_OUT",
    "enabled": true,
    "threshold": {
      "operator": "LESS_THAN",
      "threshold": 1,
      "units": "HOURS"
    },
    "notifications": [{
      "typeName": "SLACK",
      "apiToken": "{slackApiToken}",
      "channelName": "mongodb-alerts",
      "intervalMin": 15,
      "delayMin": 5
    }]
  }'
```

## Step 4: Connection Limit Alert

Alert before connection pool is exhausted:

```bash
curl $AUTH -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "$ACCEPT" \
  -d '{
    "eventTypeName": "OUTSIDE_METRIC_THRESHOLD",
    "enabled": true,
    "metricThreshold": {
      "metricName": "CONNECTIONS_PERCENT",
      "operator": "GREATER_THAN",
      "threshold": 80,
      "units": "RAW",
      "mode": "AVERAGE"
    },
    "notifications": [{
      "typeName": "EMAIL",
      "emailEnabled": true,
      "emailAddress": "ops@example.com",
      "intervalMin": 5,
      "delayMin": 2
    }]
  }'
```

## Step 5: Prometheus Alerting Rules for Self-Hosted

For self-hosted MongoDB, define Prometheus alerting rules:

```yaml
# mongodb-alerts.yml
groups:
- name: mongodb
  rules:

  - alert: MongoDBDown
    expr: up{job="mongodb"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "MongoDB instance {{ $labels.instance }} is down"

  - alert: MongoDBReplicationLag
    expr: mongodb_mongod_replset_member_replication_lag_seconds > 30
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "MongoDB replication lag is {{ $value }}s on {{ $labels.member }}"

  - alert: MongoDBHighConnections
    expr: >
      (mongodb_ss_connections{conn_type="current"} /
       mongodb_ss_connections{conn_type="available"}) > 0.8
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "MongoDB connection usage is above 80%"

  - alert: MongoDBDiskUsageHigh
    expr: >
      (node_filesystem_size_bytes{mountpoint="/data/mongodb"} -
       node_filesystem_free_bytes{mountpoint="/data/mongodb"}) /
       node_filesystem_size_bytes{mountpoint="/data/mongodb"} > 0.80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "MongoDB disk usage is above 80%"

  - alert: MongoDBSlowQueryRate
    expr: rate(mongodb_mongod_op_latencies_latency_total{type="reads"}[5m]) > 100
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High slow query rate on {{ $labels.instance }}"
```

## Step 6: Custom Script-Based Alerting

For simpler deployments, a monitoring script with webhook notifications:

```python
import pymongo
import requests
import os

MONGO_URI = os.environ["MONGO_URI"]
SLACK_WEBHOOK = os.environ["SLACK_WEBHOOK_URL"]

def send_alert(message: str):
    requests.post(SLACK_WEBHOOK, json={"text": f":rotating_light: MongoDB Alert: {message}"})

client = pymongo.MongoClient(MONGO_URI)

# Check replication lag
rs_status = client.admin.command("replSetGetStatus")
primary_time = None
for member in rs_status["members"]:
    if member["state"] == 1:
        primary_time = member.get("optimeDate")

for member in rs_status["members"]:
    if member["state"] == 2 and primary_time:
        lag = (primary_time - member.get("optimeDate", primary_time)).total_seconds()
        if lag > 30:
            send_alert(f"Replication lag on {member['name']}: {lag:.0f}s")

# Check connections
server_status = client.admin.command("serverStatus")
current = server_status["connections"]["current"]
available = server_status["connections"]["available"]
if current / (current + available) > 0.8:
    send_alert(f"Connection usage at {current}/{current+available} ({current/(current+available)*100:.0f}%)")
```

## Summary

Production MongoDB alerting should cover primary elections, disk usage above 75%, oplog window thresholds, replication lag, connection pool usage above 80%, and authentication failures. Use MongoDB Atlas alert configurations for managed deployments, Prometheus alerting rules for self-hosted clusters, or custom scripts with webhook notifications for simpler environments. Configure alerts before go-live so the team is ready to respond from day one.
