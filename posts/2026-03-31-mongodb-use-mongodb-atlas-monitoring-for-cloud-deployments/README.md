# How to Use MongoDB Atlas Monitoring for Cloud Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Monitoring, Cloud, Dashboard

Description: Use MongoDB Atlas built-in monitoring features including Real-Time Performance Panel, metrics charts, alerts, and third-party integrations for cloud deployments.

---

## Introduction

MongoDB Atlas provides built-in monitoring that requires zero configuration for basic observability. The Atlas monitoring suite includes real-time metrics, performance advisor, query analyzer, and alert management - all accessible from the Atlas UI or API. This guide covers making the most of Atlas monitoring for production cloud deployments.

## Real-Time Performance Panel

The Atlas Real-Time Performance Panel (RTPP) shows live metrics without any agent setup:

```text
Atlas UI -> Cluster -> Metrics tab

Key panels available:
- Connections: Current vs available
- Opcounters: Queries, inserts, updates, deletes per second
- Network: Bytes in/out, number of requests
- Memory: Resident, virtual, mapped
- Disk I/O: Read/write latency and IOPS
```

## Querying Metrics via Atlas API

```python
# Fetch cluster metrics via the Atlas Admin API
import requests
from requests.auth import HTTPDigestAuth

PUBLIC_KEY = "your-public-key"
PRIVATE_KEY = "your-private-key"
PROJECT_ID = "your-project-id"
PROCESS_ID = "your-hostname:27017"  # Atlas process host:port

def get_metrics(metric_name, granularity="PT5M", period="PT1H"):
    url = (
        f"https://cloud.mongodb.com/api/atlas/v1.0/groups/{PROJECT_ID}"
        f"/processes/{PROCESS_ID}/measurements"
    )
    params = {
        "granularity": granularity,
        "period": period,
        "m": metric_name
    }
    response = requests.get(
        url,
        params=params,
        auth=HTTPDigestAuth(PUBLIC_KEY, PRIVATE_KEY)
    )
    return response.json()

metrics = get_metrics("CONNECTIONS")
for point in metrics["measurements"][0]["dataPoints"][-5:]:
    print(f"{point['timestamp']}: {point['value']} connections")
```

## Configuring Atlas Alerts

```bash
# Create an alert via Atlas CLI
atlas alerts settings create \
  --projectId <PROJECT_ID> \
  --event REPLICATION_OPLOG_WINDOW_RUNNING_OUT \
  --enabled \
  --notificationType SLACK \
  --notificationToken $SLACK_TOKEN \
  --notificationChannelName mongodb-alerts
```

Common alert events to configure:

```text
CONNECTIONS_PERCENT_OVER_80     - Connection pool saturation
REPLICATION_OPLOG_WINDOW_RUNNING_OUT - Oplog window shrinking
DISK_AUTO_SCALE_INITIATED       - Storage auto-scaling triggered
QUERY_TARGETING_SCANNED_RATIO_EXCEEDED - Poor index coverage
NO_PRIMARY                      - Primary election failure
```

## Performance Advisor

Atlas automatically identifies slow operations and recommends indexes:

```bash
# View suggested indexes via API
curl --digest -u "$PUBLIC_KEY:$PRIVATE_KEY" \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/${PROJECT_ID}/processes/${HOST}:${PORT}/performanceAdvisor/suggestedIndexes" \
  | jq '.suggestedIndexes[] | {namespace, index: .index}'
```

## Third-Party Integration with Datadog

```bash
# Enable Datadog integration via Atlas CLI
atlas integrations create DATADOG \
  --projectId <PROJECT_ID> \
  --apiKey $DATADOG_API_KEY \
  --region US
```

## Atlas Charts for Custom Dashboards

```javascript
// MongoDB Atlas Charts data source query
// Aggregate hourly connection counts
[
  {
    "$match": {
      "ts": { "$gte": { "$date": "2026-03-30T00:00:00Z" } }
    }
  },
  {
    "$group": {
      "_id": {
        "$dateTrunc": { "date": "$ts", "unit": "hour" }
      },
      "avgConnections": { "$avg": "$connections.current" }
    }
  },
  { "$sort": { "_id": 1 } }
]
```

## Summary

Atlas monitoring provides immediate observability with no infrastructure overhead - built-in alerts are available on all cluster tiers, while the Real-Time Performance Panel and Performance Advisor require M10+ dedicated clusters. For production workloads, configure alerts on connection percentage, oplog window, and query targeting ratio. Use the Atlas Admin API to programmatically pull metrics into your existing observability platform or export to Datadog and other third-party tools via native integrations.
