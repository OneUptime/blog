# How to Implement Event Aggregation with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event Aggregation, Pub/Sub, State Management, Batch

Description: Implement event aggregation patterns with Dapr to collect, batch, and combine multiple events into summarized outputs for downstream processing and analytics.

---

## Overview

Event aggregation combines multiple individual events into a single, summarized event. This reduces downstream processing load and is useful for metrics rollups, order line item batching, and telemetry summarization. Dapr's pub/sub and state APIs make it straightforward to implement.

## Time-Based Aggregation Window

Aggregate events within a 1-minute tumbling window:

```javascript
const { DaprServer, DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

async function aggregateClickEvent(userId, productId, timestamp) {
  const windowMinute = Math.floor(timestamp / 60000);
  const aggKey = `clicks-${windowMinute}`;

  const agg = await client.state.get('statestore', aggKey) || {
    windowStart: windowMinute * 60000,
    windowEnd: (windowMinute + 1) * 60000,
    events: [],
    totalClicks: 0
  };

  agg.events.push({ userId, productId, timestamp });
  agg.totalClicks += 1;

  await client.state.save('statestore', [{
    key: aggKey,
    value: agg,
    metadata: { ttlInSeconds: '120' }
  }]);

  return agg;
}

async function flushAggregation(windowMinute) {
  const aggKey = `clicks-${windowMinute}`;
  const agg = await client.state.get('statestore', aggKey);
  if (!agg) return;

  // Publish the aggregated summary
  await client.pubsub.publish('pubsub', 'click-summaries', {
    windowStart: agg.windowStart,
    windowEnd: agg.windowEnd,
    totalClicks: agg.totalClicks,
    uniqueUsers: [...new Set(agg.events.map(e => e.userId))].length
  });

  await client.state.delete('statestore', aggKey);
  console.log(`Flushed aggregation for window ${windowMinute}: ${agg.totalClicks} clicks`);
}
```

## Count-Based Aggregation

Aggregate into batches of a fixed size:

```javascript
async function aggregateOrderItem(orderId, item) {
  const batchKey = `order-batch-${orderId}`;
  const batch = await client.state.get('statestore', batchKey) || { orderId, items: [], total: 0 };

  batch.items.push(item);
  batch.total += item.price * item.quantity;

  if (batch.items.length >= 50) {
    // Flush the batch
    await client.pubsub.publish('pubsub', 'order-batches', batch);
    await client.state.delete('statestore', batchKey);
    console.log(`Flushed order batch for ${orderId}: ${batch.items.length} items`);
  } else {
    await client.state.save('statestore', [{ key: batchKey, value: batch }]);
  }
}
```

## Multi-Source Aggregation

Combine events from multiple topics into one aggregated output:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: multi-source-aggregator
spec:
  pubsubname: pubsub
  topic: web-events
  route: /aggregate
---
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: mobile-aggregator
spec:
  pubsubname: pubsub
  topic: mobile-events
  route: /aggregate
```

```javascript
app.post('/aggregate', async (req, res) => {
  const { source, userId, action } = req.body.data;
  await aggregateUserAction(userId, source, action, Date.now());
  res.status(200).send('OK');
});
```

## Scheduled Flush with Dapr Bindings

Use a cron binding to flush aggregations on schedule:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: flush-cron
spec:
  type: bindings.cron
  version: v1
  metadata:
  - name: schedule
    value: "@every 1m"
```

```javascript
app.post('/flush-cron', async (req, res) => {
  const prevMinute = Math.floor(Date.now() / 60000) - 1;
  await flushAggregation(prevMinute);
  res.status(200).send('OK');
});
```

## Summary

Event aggregation with Dapr combines pub/sub subscriptions for event ingestion with state management for accumulating data across a time or count window. Use TTL-enabled state keys to automatically expire unprocessed aggregation windows and cron bindings to trigger periodic flushes. This pattern effectively reduces downstream event volume while preserving aggregate insights.
