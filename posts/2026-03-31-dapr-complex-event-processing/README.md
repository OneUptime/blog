# How to Implement Complex Event Processing with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Complex Event Processing, Event-Driven, Pattern Detection, Pub/Sub

Description: Implement complex event processing (CEP) patterns with Dapr to detect multi-event patterns, temporal sequences, and anomalies across distributed event streams.

---

## Overview

Complex Event Processing (CEP) involves detecting patterns across multiple events over time. With Dapr, you can implement CEP by combining pub/sub subscriptions with stateful actors or state management to correlate events and trigger responses when patterns match.

## Pattern: Detecting Sequential Events

Detect when a user completes a multi-step funnel (view -> add to cart -> purchase):

```javascript
const { DaprServer, DaprClient } = require('@dapr/dapr');
const server = new DaprServer();
const client = new DaprClient();

const FUNNEL_STEPS = ['product-viewed', 'cart-added', 'checkout-started', 'order-placed'];
const FUNNEL_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

async function handleFunnelEvent(eventType, userId, timestamp) {
  const stateKey = `funnel-${userId}`;
  const funnel = await client.state.get('statestore', stateKey) || { steps: [], startTime: timestamp };

  // Expire old funnel state
  if (timestamp - funnel.startTime > FUNNEL_WINDOW_MS) {
    funnel.steps = [];
    funnel.startTime = timestamp;
  }

  if (!funnel.steps.includes(eventType)) {
    funnel.steps.push(eventType);
  }

  // Check if all steps completed
  const completed = FUNNEL_STEPS.every(s => funnel.steps.includes(s));
  if (completed) {
    await client.pubsub.publish('pubsub', 'funnel-completed', { userId, completedAt: timestamp });
    funnel.steps = [];
  }

  await client.state.save('statestore', [{ key: stateKey, value: funnel }]);
}
```

## Pattern: Threshold-Based Alerting

Alert when error count exceeds a threshold within a time window:

```javascript
async function handleErrorEvent(serviceId, errorCode, timestamp) {
  const windowKey = `errors-${serviceId}-${Math.floor(timestamp / 60000)}`;
  const windowData = await client.state.get('statestore', windowKey) || { count: 0, errors: [] };

  windowData.count += 1;
  windowData.errors.push({ errorCode, timestamp });

  if (windowData.count >= 10) {
    await client.pubsub.publish('pubsub', 'service-degraded', {
      serviceId,
      errorCount: windowData.count,
      timeWindow: '1 minute',
      errors: windowData.errors.slice(-5)
    });
  }

  // Set TTL so state expires after 2 minutes
  await client.state.save('statestore', [{
    key: windowKey,
    value: windowData,
    metadata: { ttlInSeconds: '120' }
  }]);
}
```

## Subscription Routing for CEP

Route different event types to specific handlers:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: cep-subscription
spec:
  pubsubname: pubsub
  topic: user-events
  routes:
    rules:
    - match: event.type == "product-viewed"
      path: /cep/funnel-step
    - match: event.type == "cart-added"
      path: /cep/funnel-step
    - match: event.type == "order-placed"
      path: /cep/funnel-step
    default: /cep/other-event
```

## Using Dapr Actors for Stateful CEP

Actors provide isolated, ordered execution ideal for per-entity CEP:

```javascript
class UserFunnelActor {
  async trackEvent(eventType) {
    const [exists, value] = await this.stateManager.tryGetState('funnel');
    const state = exists ? value : { steps: [] };
    state.steps.push({ type: eventType, time: Date.now() });
    await this.stateManager.setState('funnel', state);

    if (this.isFunnelComplete(state.steps)) {
      await this.publishFunnelCompletion();
    }
  }
}
```

## Summary

Dapr enables complex event processing by providing the pub/sub backbone for event ingestion and state management for temporal pattern tracking. By combining subscription routing with stateful processing - either via state stores or Dapr actors - you can implement sophisticated CEP patterns like funnel detection, threshold alerting, and anomaly detection without a dedicated CEP engine.
