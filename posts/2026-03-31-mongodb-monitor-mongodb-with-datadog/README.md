# How to Monitor MongoDB with Datadog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Datadog, Monitoring, Metric, APM

Description: Configure the Datadog Agent to monitor MongoDB with built-in integration, custom metrics, and dashboards for comprehensive database observability.

---

## Introduction

Datadog offers a first-class MongoDB integration that collects metrics, enables APM tracing for MongoDB operations, and provides out-of-the-box dashboards. This guide walks through setting up the Datadog Agent with MongoDB monitoring, configuring the integration, and creating useful monitors.

## Prerequisites

- Datadog Agent 7+ installed on the MongoDB host or in your cluster
- A Datadog API key
- MongoDB 4.4+

## Creating a Datadog Monitor User

```javascript
use admin
db.createUser({
  user: "datadog",
  pwd: "DatadogPass123",
  roles: [
    { role: "read", db: "admin" },
    { role: "readAnyDatabase", db: "admin" },
    { role: "clusterMonitor", db: "admin" },
    { role: "read", db: "local" }
  ]
})
```

## Configuring the MongoDB Integration

Edit the MongoDB check configuration:

```yaml
# /etc/datadog-agent/conf.d/mongo.d/conf.yaml
init_config:

instances:
  - hosts:
      - localhost:27017
    username: datadog
    password: DatadogPass123
    database: admin
    options:
      authSource: admin
    additional_metrics:
      - metrics.commands
      - tcmalloc
      - top
      - collection
    collections:
      - users
      - orders
    collections_indexes_stats: true
```

```bash
# Restart the agent and verify
sudo systemctl restart datadog-agent
datadog-agent check mongo
```

## Docker/Kubernetes Configuration

For containerized deployments, set the check via annotations:

```yaml
# Kubernetes pod annotation
annotations:
  ad.datadoghq.com/mongodb.checks: |
    {
      "mongo": {
        "init_config": {},
        "instances": [
          {
            "hosts": ["%%host%%:27017"],
            "username": "datadog",
            "password": "ENC[mongo_credentials;password]"
          }
        ]
      }
    }
```

## APM Tracing for MongoDB

Enable APM in your Node.js application to trace MongoDB queries:

```javascript
// app.js - must be the first import
const tracer = require("dd-trace").init({
  service: "my-node-app",
  env: "production"
})

const { MongoClient } = require("mongodb")
const client = new MongoClient(process.env.MONGODB_URI)

// All MongoDB operations are automatically traced
const users = await client.db().collection("users").find({}).toArray()
```

## Key Metrics to Monitor

```text
mongodb.connections.current          - Active connections
mongodb.connections.available        - Remaining connection slots
mongodb.opcounters.query             - Queries per second
mongodb.opcounters.insert            - Inserts per second
mongodb.mem.resident                 - Resident memory (MB)
mongodb.replset.replicationlag       - Replication lag (seconds)
mongodb.wiredtiger.cache.bytes_currently_in_cache - Cache bytes in use
mongodb.stats.data_size              - Total data size
mongodb.stats.index_size             - Total index size
```

## Creating a Datadog Monitor

```python
# Using the Datadog API to create a monitor
import requests

monitor = {
    "type": "metric alert",
    "query": "avg(last_5m):avg:mongodb.connections.current{*} > 800",
    "name": "MongoDB - High Connection Count",
    "message": "MongoDB connections are above 800. @pagerduty",
    "options": {
        "thresholds": {
            "critical": 800,
            "warning": 600
        },
        "notify_no_data": True,
        "no_data_timeframe": 5
    }
}

response = requests.post(
    "https://api.datadoghq.com/api/v1/monitor",
    headers={"DD-API-KEY": "YOUR_API_KEY", "DD-APPLICATION-KEY": "YOUR_APP_KEY"},
    json=monitor
)
```

## Summary

Datadog's MongoDB integration provides a comprehensive view of database health through the built-in check, APM tracing for query-level visibility, and out-of-the-box dashboards. Start with a minimal monitor user, enable `additional_metrics` for deeper coverage, and pair it with APM to correlate slow MongoDB queries with application-level performance issues. Use Datadog monitors to alert on connection saturation and replication lag.
