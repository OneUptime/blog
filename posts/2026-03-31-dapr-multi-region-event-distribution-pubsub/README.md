# How to Implement Multi-Region Event Distribution with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Multi-Region, Geo-Distribution, Disaster Recovery

Description: Learn how to distribute Dapr pub/sub events across multiple geographic regions for low latency, disaster recovery, and data residency requirements.

---

## Why Multi-Region Event Distribution?

A single pub/sub broker is a single point of failure and adds latency for geographically dispersed consumers. Multi-region event distribution replicates events to regional brokers so consumers in each region receive events from a local broker with minimal cross-region traffic.

## Architecture

- Primary region publishes to its local broker.
- A bridge service subscribes in the primary region and republishes to secondary regions.
- Regional consumers subscribe to their local brokers.

## Regional Pub/Sub Components

Define a component per region:

```yaml
# us-east broker
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub-us-east
  namespace: production
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka-us-east.corp:9092"
    - name: consumerGroup
      value: "bridge-consumers"
---
# eu-west broker
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub-eu-west
  namespace: production
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka-eu-west.corp:9092"
    - name: consumerGroup
      value: "eu-west-consumers"
```

## Bridge Service: Replicate to Secondary Regions

```javascript
import { DaprServer, DaprClient } from '@dapr/dapr';
const server = new DaprServer();
const client = new DaprClient();

const SECONDARY_REGIONS = ['pubsub-eu-west', 'pubsub-ap-southeast'];
const TOPICS_TO_REPLICATE = ['order.placed', 'customer.updated', 'payment.processed'];

for (const topic of TOPICS_TO_REPLICATE) {
  await server.pubsub.subscribe('pubsub-us-east', topic, async (event) => {
    // Skip if this is already a replicated event (prevent loops)
    if (event.originRegion !== process.env.AWS_REGION) return;

    await Promise.all(
      SECONDARY_REGIONS.map(broker =>
        client.pubsub.publish(broker, topic, {
          ...event,
          replicatedFrom: 'us-east',
          replicatedAt: new Date().toISOString()
        })
      )
    );
  });
}
```

## Publisher: Tag Events with Origin Region

```javascript
async function publishEvent(topic, payload) {
  await client.pubsub.publish('pubsub-us-east', topic, {
    ...payload,
    originRegion: process.env.AWS_REGION || 'us-east',
    publishedAt: new Date().toISOString()
  });
}
```

## Regional Consumer: Subscribe to Local Broker

```javascript
// EU consumer subscribes to its regional broker
await server.pubsub.subscribe('pubsub-eu-west', 'order.placed', async (event) => {
  console.log(`Processing order from region ${event.originRegion}`);
  await processOrder(event);
});
```

## Handling Data Residency

For GDPR compliance, some events must not leave certain regions:

```javascript
async function publishWithResidency(topic, payload, allowedRegions) {
  const localRegion = process.env.AWS_REGION;

  if (!allowedRegions.includes(localRegion)) {
    console.log(`Skipping publish - region ${localRegion} not in allowed list`);
    return;
  }

  await client.pubsub.publish(`pubsub-${localRegion}`, topic, {
    ...payload,
    dataResidency: allowedRegions
  });
}
```

## Monitoring Replication Lag

```javascript
await server.pubsub.subscribe('pubsub-eu-west', 'order.placed', async (event) => {
  const lagMs = Date.now() - new Date(event.publishedAt).getTime();
  metrics.recordGauge('cross_region_replication_lag_ms', lagMs, {
    origin: event.originRegion
  });
  await processOrder(event);
});
```

## Summary

Dapr multi-region event distribution uses a bridge service to replicate events from a primary broker to regional brokers. Origin tagging prevents replication loops, data residency checks enforce compliance, and per-region consumer groups ensure each cluster processes events from its local broker independently.
