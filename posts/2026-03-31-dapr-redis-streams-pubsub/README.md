# How to Configure Dapr with Redis Streams Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Redis, Redis Streams, Pub/Sub, Messaging

Description: Learn how to configure Dapr with Redis Streams as a pub/sub broker, enabling durable message delivery and consumer groups using your existing Redis infrastructure.

---

## Overview

Redis Streams is a log-based data structure in Redis that provides durable, ordered, and replayable message streams. When used as a Dapr pub/sub component, Redis Streams enables reliable messaging between microservices without requiring a separate message broker. This is a practical choice if Redis is already in your stack for state management.

## Prerequisites

- A running Redis instance (version 5.0 or later, for Streams support)
- Dapr CLI and runtime installed

## Redis Streams vs Redis List Pub/Sub

| Feature | Redis Streams | Redis Pub/Sub |
|---------|--------------|---------------------|
| Durability | Yes (persisted) | No (fire-and-forget) |
| Consumer groups | Yes | No |
| Message replay | Yes | No |
| Acknowledgment | Yes | No |
| Dapr component | `pubsub.redis` | Not a Dapr component |

Dapr's `pubsub.redis` component always uses Redis Streams internally for message delivery, providing consumer group semantics and at-least-once guarantees.

## Configuring the Dapr Redis Streams Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis.default.svc.cluster.local:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: enableTLS
    value: "false"
  - name: processingTimeout
    value: "60s"
  - name: redeliverInterval
    value: "2s"
  - name: maxLenApprox
    value: "1000"
  - name: consumerID
    value: ""
```

The `maxLenApprox` option sets the approximate maximum length of each stream, preventing unbounded growth.

Apply the component:

```bash
kubectl apply -f redis-pubsub.yaml
```

## Publishing Messages

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Publish a notification event
await client.pubsub.publish("redis-pubsub", "user-events", {
  eventType: "user.signup",
  userId: "user-10042",
  email: "newuser@example.com",
  timestamp: new Date().toISOString()
});

console.log("Published user signup event");
```

## Subscribing and Processing Messages

```javascript
import { DaprServer } from "@dapr/dapr";

const server = new DaprServer({ serverHost: "127.0.0.1", serverPort: "3001" });

await server.pubsub.subscribe("redis-pubsub", "user-events", async (data) => {
  console.log("Processing event:", data.eventType, "for user:", data.userId);

  if (data.eventType === "user.signup") {
    await sendWelcomeEmail(data.email);
  }

  // Returning without error acknowledges the message
});

await server.start();
```

## Inspecting Streams Directly

You can inspect the Redis Streams backing the pub/sub topics:

```bash
# List all stream entries in the topic
redis-cli XRANGE user-events - + COUNT 10

# Check consumer group lag
redis-cli XINFO GROUPS user-events

# View pending (unacknowledged) messages (replace <app-id> with your Dapr app ID)
redis-cli XPENDING user-events <app-id> - + 10
```

## Monitoring Message Throughput

```bash
# Check stream length
redis-cli XLEN user-events

# Monitor publish commands in real-time
redis-cli MONITOR | grep XADD
```

## Summary

Dapr with Redis Streams pub/sub delivers reliable, durable messaging using your existing Redis infrastructure, with consumer group semantics and at-least-once delivery guarantees. The `processingTimeout` and `redeliverInterval` settings ensure messages are redelivered if a consumer fails, while `maxLenApprox` prevents streams from growing unbounded.
