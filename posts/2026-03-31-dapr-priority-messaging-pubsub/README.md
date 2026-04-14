# How to Implement Priority Messaging with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Priority Queue, Messaging, Queue

Description: Learn how to implement priority messaging with Dapr pub/sub using separate topics per priority tier to ensure high-priority messages are processed before low-priority ones.

---

## Why Priority Messaging?

Not all messages are equal. A payment failure alert should preempt a weekly digest newsletter. While some Dapr pub/sub brokers like RabbitMQ support priority queues natively via `maxPriority`, most — including Redis — do not. Separate topics per priority tier combined with consumer concurrency settings provide a broker-agnostic alternative.

## Priority Topic Design

Create one topic per priority level:

| Topic | Priority | Use Case |
|---|---|---|
| `notifications.critical` | 1 - Highest | Payment failures, security alerts |
| `notifications.high` | 2 | Order confirmations, shipping updates |
| `notifications.normal` | 3 | Account activity, promotions |
| `notifications.low` | 4 | Newsletters, recommendations |

## Configure Pub/Sub

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: priority-pubsub
  namespace: production
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
```

## Publisher with Priority Routing

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

const PRIORITY_TOPIC = {
  critical: 'notifications.critical',
  high: 'notifications.high',
  normal: 'notifications.normal',
  low: 'notifications.low'
};

async function sendNotification(userId, notification) {
  const priority = notification.priority || 'normal';
  const topic = PRIORITY_TOPIC[priority];

  if (!topic) throw new Error(`Unknown priority: ${priority}`);

  await client.pubsub.publish('priority-pubsub', topic, {
    userId,
    ...notification,
    publishedAt: new Date().toISOString()
  });
}

// Send a critical payment failure alert
await sendNotification('user-123', {
  title: 'Payment failed',
  body: 'Your subscription payment could not be processed.',
  priority: 'critical'
});

// Send a low-priority newsletter
await sendNotification('user-123', {
  title: 'Your weekly digest',
  priority: 'low'
});
```

## Consumer with Priority-Aware Processing

Run more consumers for higher priority topics:

```javascript
const { DaprServer } = require('@dapr/dapr');
const server = new DaprServer();

// Critical: process immediately, max concurrency
await server.pubsub.subscribe('priority-pubsub', 'notifications.critical', async (event) => {
  await processNotificationNow(event);
});

// High: process quickly
await server.pubsub.subscribe('priority-pubsub', 'notifications.high', async (event) => {
  await processNotification(event);
});

// Normal: standard processing
await server.pubsub.subscribe('priority-pubsub', 'notifications.normal', async (event) => {
  await processNotification(event);
});

// Low: can be batched
await server.pubsub.subscribe('priority-pubsub', 'notifications.low', async (event) => {
  await batchNotificationQueue.add(event);
});
```

## Scaling Consumers by Priority

Deploy more replicas for high-priority consumers:

```yaml
# critical-consumer-deployment.yaml
spec:
  replicas: 5    # 5 replicas for critical
---
# low-consumer-deployment.yaml
spec:
  replicas: 1    # 1 replica for low-priority
```

## Escalation: Promote Stale Messages

Move messages to higher priority topics if they wait too long:

```javascript
async function escalateStaleMessages() {
  const stale = await db.query(
    `SELECT * FROM notification_queue
     WHERE priority = 'normal'
       AND created_at < NOW() - INTERVAL '10 minutes'`
  );

  for (const msg of stale.rows) {
    await client.pubsub.publish('priority-pubsub', 'notifications.high', {
      ...msg,
      escalatedFrom: 'normal',
      escalatedAt: new Date().toISOString()
    });
  }
}
```

## Summary

Priority messaging in Dapr pub/sub is achieved through separate topics per priority level combined with differential consumer scaling. Critical messages get their own high-throughput consumer pool while low-priority topics are handled by minimal replicas, ensuring time-sensitive messages are never delayed by lower-priority work.
