# How to Monitor Atlas Stream Processing Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Stream Processing, Monitoring, Performance

Description: Learn how to monitor Atlas Stream Processing pipelines using metrics, logs, and alerts to ensure low latency and high throughput in real-time data workflows.

---

## Overview

MongoDB Atlas Stream Processing lets you run continuous aggregation pipelines on streaming data. Monitoring pipeline health is critical to catching bottlenecks, message lag, and processing errors before they affect your application.

## Key Metrics to Track

Atlas exposes stream processing metrics through the Atlas UI and the Atlas Administration API. The most important metrics are:

- **Input throughput** - messages received per second
- **Output throughput** - messages written per second
- **Processing latency** - time from message arrival to output
- **Dead-letter queue (DLQ) count** - messages that failed processing
- **Pipeline state** - CREATED, STARTED, STOPPED, or FAILED

## Querying Pipeline Metrics via the Atlas API

Use the Atlas Administration API to pull metrics programmatically:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" --digest \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/streams/{tenantName}/metrics" \
  -H "Accept: application/vnd.atlas.2023-02-01+json"
```

This returns a JSON payload with time-series data for each metric. You can integrate this into your observability stack (Datadog, Prometheus, or OneUptime).

## Setting Up Alerts in Atlas

Navigate to **Atlas > Alerts > Add Alert** and create rules for:

```text
Metric: Stream Processing - Dead Letter Queue Messages
Condition: Is Greater Than
Threshold: 100
Action: Send email / PagerDuty / Webhook
```

Configure a webhook alert to push notifications to OneUptime or your incident management platform so your team is paged immediately when messages start failing.

## Checking Pipeline Status with mongosh

Connect to your Stream Processing Instance and run:

```javascript
sp.listStreamProcessors()
```

This returns each processor's name, state, start time, and pipeline definition. You can also filter by state, for example `sp.listStreamProcessors({ state: "STARTED" })`.

## Monitoring Latency with a Python Script

```python
import requests
from requests.auth import HTTPDigestAuth
import os

PUBLIC_KEY = os.environ["ATLAS_PUBLIC_KEY"]
PRIVATE_KEY = os.environ["ATLAS_PRIVATE_KEY"]
GROUP_ID = os.environ["ATLAS_GROUP_ID"]
TENANT = "my-stream-instance"

url = f"https://cloud.mongodb.com/api/atlas/v2/groups/{GROUP_ID}/streams/{TENANT}/metrics"
response = requests.get(url, auth=HTTPDigestAuth(PUBLIC_KEY, PRIVATE_KEY),
                        headers={"Accept": "application/vnd.atlas.2023-02-01+json"})

data = response.json()
for metric in data.get("results", []):
    print(f"{metric['name']}: {metric['dataPoints'][-1]['value']}")
```

Run this script on a schedule (via cron or a monitoring agent) to track latency trends over time.

## Analyzing DLQ Messages

When a message fails, Atlas writes it to the dead-letter queue collection you configured when creating the stream processor. The DLQ collection name is user-defined in the `dlq` option of `sp.createStreamProcessor()`. Query it to diagnose failures:

```javascript
// Replace with your configured DLQ database and collection name
use ASPErrorStorage
db.getCollection("myProcessorDLQ").find({}).sort({ _id: -1 }).limit(10).pretty()
```

Each document contains the original message, the error reason, and a timestamp. Common causes include schema mismatches, downstream sink timeouts, and malformed JSON.

## Best Practices

- Set DLQ alerts to trigger at low thresholds (10-50 messages) so failures are caught early.
- Export metrics to a time-series database like Prometheus using the Atlas API and a custom scraper.
- Use Atlas Performance Advisor alongside stream metrics to correlate pipeline slowdowns with replica set load.
- Restart a stalled pipeline using `sp.pipelineName.start()` on your Stream Processing Instance after diagnosing the root cause.

## Summary

Monitoring Atlas Stream Processing performance requires tracking throughput, latency, and DLQ depth through Atlas UI alerts, the Administration API, and mongosh commands. Automating metric collection with scripts and integrating with your observability platform gives you full visibility into your real-time pipelines.
