# How to Use Dapr Pub/Sub for Real-Time Data Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Data Pipeline, Streaming, Microservice

Description: Learn how to build real-time data pipelines using Dapr pub/sub to ingest, transform, and route high-volume event streams between microservices.

---

## Real-Time Pipelines with Dapr

A real-time data pipeline ingests raw events, transforms them, enriches them with additional context, and routes the results to downstream consumers - all with sub-second latency. Dapr pub/sub provides the event bus that connects pipeline stages, with each stage subscribing to an upstream topic and publishing to a downstream one.

## Pipeline Architecture

```text
Ingest Topic (raw-events)
    |
    v
Validation Stage --> invalid-events (dead letter)
    |
    v
Enrichment Topic (validated-events)
    |
    v
Enrichment Stage (adds geo, user context)
    |
    v
Output Topic (enriched-events)
    |
    v
Multiple Consumers (analytics, storage, alerts)
```

## Stage 1 - Validation and Filtering

```javascript
const express = require("express");
const { DaprClient } = require("@dapr/dapr");
const app = express();
app.use(express.json());
const client = new DaprClient();

app.get("/dapr/subscribe", (req, res) => {
  res.json([
    {
      pubsubname: "pubsub",
      topic: "raw-events",
      route: "/pipeline/validate",
      deadLetterTopic: "invalid-events",
    },
  ]);
});

app.post("/pipeline/validate", async (req, res) => {
  const event = req.body.data;

  // Validate required fields
  if (!event.userId || !event.eventType || !event.timestamp) {
    console.warn("Invalid event, dropping:", event);
    return res.json({ status: "DROP" });
  }

  // Filter low-value events
  if (event.eventType === "PING" || event.eventType === "HEARTBEAT") {
    return res.json({ status: "DROP" });
  }

  // Forward to next stage
  await client.pubsub.publish("pubsub", "validated-events", event);
  res.sendStatus(200);
});
```

## Stage 2 - Enrichment

```javascript
app.get("/dapr/subscribe", (req, res) => {
  res.json([
    {
      pubsubname: "pubsub",
      topic: "validated-events",
      route: "/pipeline/enrich",
    },
  ]);
});

app.post("/pipeline/enrich", async (req, res) => {
  const event = req.body.data;

  // Look up user context from state store
  const userProfile = await client.state.get(
    "statestore",
    `user:${event.userId}`
  );

  // Enrich event
  const enrichedEvent = {
    ...event,
    userCountry: userProfile?.country ?? "unknown",
    userTier: userProfile?.tier ?? "free",
    processedAt: new Date().toISOString(),
    pipelineVersion: "1.2.0",
  };

  await client.pubsub.publish("pubsub", "enriched-events", enrichedEvent);
  res.sendStatus(200);
});
```

## Stage 3 - Multiple Downstream Consumers

Different services consume the enriched stream independently:

```javascript
// Analytics consumer
app.post("/consumers/analytics", async (req, res) => {
  const event = req.body.data;
  await writeToClickHouse("events", event);
  res.sendStatus(200);
});

// Alert consumer - triggers on specific patterns
app.post("/consumers/alerts", async (req, res) => {
  const event = req.body.data;

  if (event.eventType === "ERROR" && event.userTier === "enterprise") {
    await triggerPagerDutyAlert(event);
  }

  res.sendStatus(200);
});

// Cold storage consumer
app.post("/consumers/storage", async (req, res) => {
  const event = req.body.data;
  await writeToS3(`events/${event.userCountry}/${Date.now()}.json`, event);
  res.sendStatus(200);
});
```

## Handling Backpressure

When a consumer is slow, configure bulk subscribe in the subscription to batch messages and reduce overhead:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: enriched-events-sub
spec:
  topic: enriched-events
  routes:
    default: /consumers/analytics
  pubsubname: pubsub
  bulkSubscribe:
    enabled: true
    maxMessagesCount: 10
    maxAwaitDurationMs: 1000
```

## Pipeline Monitoring

Track pipeline throughput with Dapr metrics:

```bash
# Messages processed per second per stage
rate(dapr_component_pubsub_ingress_count[1m])

# Processing latency per topic
histogram_quantile(0.99, dapr_component_pubsub_ingress_latencies_bucket[1m])
```

## Summary

Dapr pub/sub enables real-time data pipelines by connecting processing stages through topics. Each stage subscribes to an upstream topic, transforms or enriches the data, and publishes to the next topic. Multiple downstream consumers can independently read from the final enriched stream, and dead letter topics catch invalid events for inspection and reprocessing.
