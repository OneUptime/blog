# How to Set Up Alerts Based on MongoDB Profiler Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Profiler, Alert, Monitoring, Atlas

Description: Configure alerts for MongoDB slow query metrics using Atlas built-in alerting and custom monitoring scripts that track profiler data in real time.

---

## Overview

Two approaches for profiler-based alerting:
1. **Atlas Built-in Alerts**: Configure threshold alerts on built-in metrics like slow query count, operation time, and query targeting efficiency
2. **Custom Profiler Monitoring**: Write scripts that query `system.profile` and trigger alerts when patterns emerge

## Approach 1: Atlas Built-in Alerts

### Step 1: Access Alert Configuration

In Atlas, go to **Project Settings > Alerts** and click **Add Alert**.

### Step 2: Configure Operation Time Alert

Alert when queries exceed a threshold:

```bash
curl --user "publicKey:privateKey" --digest \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/alertConfigs" \
  --header "Content-Type: application/json" \
  --data '{
    "eventTypeName": "OUTSIDE_METRIC_THRESHOLD",
    "enabled": true,
    "matchers": [
      {
        "fieldName": "REPLICA_SET_NAME",
        "operator": "EQUALS",
        "value": "rs0"
      }
    ],
    "metricThreshold": {
      "metricName": "OP_EXECUTION_TIME_READS",
      "mode": "AVERAGE",
      "operator": "GREATER_THAN",
      "threshold": 500,
      "units": "MILLISECONDS"
    },
    "notifications": [
      {
        "typeName": "EMAIL",
        "emailAddress": "dba@example.com",
        "intervalMin": 5,
        "delayMin": 0
      }
    ]
  }'
```

### Step 3: Alert on Query Targeting Ratio

Query targeting measures docs examined vs. docs returned. A poor ratio indicates missing indexes:

```bash
curl --user "publicKey:privateKey" --digest \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/alertConfigs" \
  --header "Content-Type: application/json" \
  --data '{
    "eventTypeName": "OUTSIDE_METRIC_THRESHOLD",
    "enabled": true,
    "metricThreshold": {
      "metricName": "QUERY_TARGETING_SCANNED_OBJECTS_PER_RETURNED",
      "mode": "AVERAGE",
      "operator": "GREATER_THAN",
      "threshold": 1000,
      "units": "RAW"
    },
    "notifications": [
      {
        "typeName": "SLACK",
        "apiToken": "xoxb-your-slack-token",
        "channelName": "database-alerts",
        "intervalMin": 15,
        "delayMin": 0
      }
    ]
  }'
```

### Step 4: Available Metric Names

Key metrics for alerting:

```text
OP_EXECUTION_TIME_READS        - Read operation execution time
OP_EXECUTION_TIME_WRITES       - Write operation execution time
OP_EXECUTION_TIME_COMMANDS     - Command execution time
QUERY_TARGETING_SCANNED_OBJECTS_PER_RETURNED - Docs scanned per returned (index efficiency)
QUERY_TARGETING_SCANNED_PER_RETURNED        - Keys scanned per returned
CONNECTIONS                    - Total connections
OPCOUNTER_QUERY                - Queries per second
```

## Approach 2: Custom Profiler Alert Script

For more granular alerting, query `system.profile` directly.

### Step 1: Enable Profiling

```javascript
// Enable profiling at 200ms threshold
db.setProfilingLevel(1, { slowms: 200 })
```

### Step 2: Write a Monitoring Script

```javascript
// monitor-slow-queries.js
const { MongoClient } = require('mongodb');

async function checkSlowQueries() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db("appdb");

  // Get queries from the last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const slowQueries = await db.collection("system.profile").find({
    ts: { $gte: fiveMinutesAgo },
    millis: { $gt: 500 }
  }).sort({ millis: -1 }).toArray();

  if (slowQueries.length === 0) {
    await client.close();
    return;
  }

  // Group by query shape
  const patterns = {};
  slowQueries.forEach(q => {
    const key = `${q.op}:${q.ns}:${q.planSummary}`;
    if (!patterns[key]) {
      patterns[key] = { count: 0, totalMillis: 0, maxMillis: 0 };
    }
    patterns[key].count++;
    patterns[key].totalMillis += q.millis;
    patterns[key].maxMillis = Math.max(patterns[key].maxMillis, q.millis);
  });

  // Build alert message
  let message = `*Slow Query Alert* - ${slowQueries.length} slow queries in last 5 minutes\n\n`;
  Object.entries(patterns).forEach(([pattern, stats]) => {
    message += `*${pattern}*\n`;
    message += `  Count: ${stats.count}, Avg: ${(stats.totalMillis/stats.count).toFixed(0)}ms, Max: ${stats.maxMillis}ms\n\n`;
  });

  // Send to Slack
  await sendSlackAlert(message);

  await client.close();
}

async function sendSlackAlert(message) {
  const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message })
  });
  if (!response.ok) {
    console.error("Failed to send Slack alert:", response.statusText);
  }
}

// Run every 5 minutes
setInterval(checkSlowQueries, 5 * 60 * 1000);
checkSlowQueries();
```

### Step 3: Alert on Collection Scan Ratio

```javascript
async function checkCollectionScans() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db("appdb");
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const stats = await db.collection("system.profile").aggregate([
    { $match: { ts: { $gte: oneHourAgo } } },
    {
      $group: {
        _id: null,
        totalOps: { $sum: 1 },
        collScans: {
          $sum: {
            $cond: [
              { $regexMatch: { input: "$planSummary", regex: /COLLSCAN/ } },
              1, 0
            ]
          }
        }
      }
    }
  ]).toArray();

  if (stats.length > 0) {
    const { totalOps, collScans } = stats[0];
    const ratio = collScans / totalOps;

    if (ratio > 0.1) {  // More than 10% collection scans
      await sendSlackAlert(
        `*Collection Scan Alert*: ${(ratio * 100).toFixed(1)}% of operations are collection scans ` +
        `(${collScans}/${totalOps} in last hour). Check for missing indexes.`
      );
    }
  }

  await client.close();
}
```

### Step 4: Run as a Cron Job

```bash
# Run every 5 minutes via crontab
*/5 * * * * /usr/bin/node /opt/scripts/monitor-slow-queries.js >> /var/log/mongo-monitor.log 2>&1
```

## Step 5: Atlas Performance Advisor as an Alternative

For Atlas clusters, the Performance Advisor automatically analyzes slow queries and suggests indexes - covering many alerting use cases without custom scripts:

```bash
# Get suggested indexes (replace <hostname:port> with your cluster process name)
atlas performanceAdvisor suggestedIndexes list --processName myCluster-shard-00-00.example.mongodb.net:27017
```

## Summary

Alert on MongoDB profiler metrics using Atlas built-in alerts for aggregate metrics like average operation execution time and query targeting ratio, or write custom Node.js monitoring scripts that query `system.profile` on a schedule. For pattern detection, group profiler entries by query shape and trigger Slack or email notifications when slow query counts, collection scan ratios, or maximum execution times exceed thresholds. Combine with Atlas Performance Advisor for index recommendations.
