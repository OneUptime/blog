# How to Implement Stream Processing with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Stream Processing, Pub/Sub, Kafka, Event

Description: Build real-time stream processing pipelines with Dapr pub/sub using Kafka as the backing broker, including consumer groups, partitioning, and stateful stream operations.

---

## Overview

Dapr's pub/sub API abstracts the underlying messaging broker, allowing you to build stream processing pipelines that work with Kafka, Redis Streams, Azure Service Bus, and others. This guide covers building a stateful stream processor using Kafka.

## Setting Up Kafka Pub/Sub Component

Configure a Kafka-backed pub/sub component for stream processing:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: stream-pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: kafka.default.svc.cluster.local:9092
  - name: consumerGroup
    value: stream-processors
  - name: initialOffset
    value: oldest
  - name: authType
    value: "none"
```

## Publishing Events to a Stream

Publish sensor readings to a Kafka topic:

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

async function publishSensorReading(sensorId, temperature, humidity) {
  const event = {
    sensorId,
    temperature,
    humidity,
    timestamp: Date.now()
  };

  await client.pubsub.publish('stream-pubsub', 'sensor-readings', event);
  console.log('Published reading:', sensorId);
}

// Simulate sensor publishing
setInterval(() => {
  publishSensorReading('sensor-001', 22.5 + Math.random(), 65 + Math.random());
}, 1000);
```

## Stream Processing Subscriber

Process the incoming stream and compute rolling averages using Dapr state:

```javascript
const { DaprServer, DaprClient } = require('@dapr/dapr');
const server = new DaprServer();
const client = new DaprClient();

await server.pubsub.subscribe('stream-pubsub', 'sensor-readings', async (data) => {
  const { sensorId, temperature } = data;

  // Read current aggregation state
  const stateKey = `sensor-avg-${sensorId}`;
  const current = await client.state.get('statestore', stateKey);

  const state = current ? JSON.parse(current) : { sum: 0, count: 0 };
  state.sum += temperature;
  state.count += 1;
  state.average = state.sum / state.count;

  // Save updated state
  await client.state.save('statestore', [{ key: stateKey, value: JSON.stringify(state) }]);

  console.log(`Sensor ${sensorId} avg temperature: ${state.average.toFixed(2)}`);
});
```

## Bulk Subscribe for High-Throughput Streams

Enable bulk message processing to handle high-throughput streams:

```javascript
await server.pubsub.subscribeBulk(
  'stream-pubsub',
  'sensor-readings',
  async (messages) => {
    const results = messages.map(msg => {
      // Process each message
      processReading(msg.data);
      return { entryId: msg.entryId, status: 'SUCCESS' };
    });
    return { statuses: results };
  },
  {
    maxMessagesCount: 100,
    maxAwaitDurationMs: 1000
  }
);
```

## Stream Filtering

Subscribe only to events matching specific criteria using routing:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: high-temp-subscription
spec:
  pubsubname: stream-pubsub
  topic: sensor-readings
  routes:
    rules:
    - match: event.data.temperature > 30
      path: /high-temperature-alert
    default: /normal-reading
```

## Summary

Dapr's pub/sub API simplifies stream processing by abstracting the broker and providing built-in retry, at-least-once delivery, and bulk processing support. Combine Dapr pub/sub with Dapr state management to build stateful stream processors that compute aggregations, detect anomalies, and route events - all without managing broker-specific SDKs.
