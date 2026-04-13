# How to Implement Work Queue with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Work Queue, Messaging, Microservice

Description: Learn how to implement a work queue pattern using Dapr Pub/Sub to distribute tasks among multiple workers for parallel, load-balanced processing.

---

## What Is a Work Queue?

A work queue (also called a task queue) distributes messages to multiple competing consumers. Each message is delivered to exactly one consumer. This pattern is ideal for distributing CPU-intensive tasks, processing jobs in parallel, or decoupling producers from workers that scale independently.

Dapr Pub/Sub implements this pattern naturally through consumer group subscriptions where multiple instances of a subscriber service each receive a portion of the messages.

## Setting Up the Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: task-queue
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: redisPassword
    value: ""
  - name: consumerID
    value: "worker-group"
```

## Publishing Tasks

A producer service publishes tasks to the queue topic:

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();

async function publishTask(taskId, payload) {
  await client.pubsub.publish('task-queue', 'image-processing', {
    taskId,
    type: 'resize',
    imageUrl: payload.imageUrl,
    targetWidth: payload.width,
    targetHeight: payload.height,
    createdAt: new Date().toISOString(),
  });
  console.log(`Task ${taskId} published to queue`);
}

// Publish 10 tasks
async function main() {
  for (let i = 1; i <= 10; i++) {
    await publishTask(`task-${i}`, {
      imageUrl: `https://cdn.example.com/image-${i}.jpg`,
      width: 800,
      height: 600,
    });
  }
}

main().catch(console.error);
```

## Implementing the Worker (Consumer)

```javascript
const { DaprServer, DaprPubSubStatusEnum } = require('@dapr/dapr');

const server = new DaprServer({
  serverHost: '127.0.0.1',
  serverPort: process.env.APP_PORT || '3001',
});

server.pubsub.subscribe('task-queue', 'image-processing', async (data) => {
  const { taskId, imageUrl, targetWidth, targetHeight } = data;

  console.log(`[Worker ${process.env.WORKER_ID}] Processing task ${taskId}`);

  try {
    // Simulate image processing work
    await resizeImage(imageUrl, targetWidth, targetHeight);
    console.log(`[Worker] Task ${taskId} completed successfully`);
    return DaprPubSubStatusEnum.SUCCESS;
  } catch (err) {
    console.error(`[Worker] Task ${taskId} failed:`, err.message);
    // Return DROP to discard, or omit to trigger retry
    return DaprPubSubStatusEnum.RETRY;
  }
});

server.start().catch(console.error);
```

## Running Multiple Workers

Deploy multiple worker instances to process the queue in parallel:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-worker
spec:
  replicas: 5
  selector:
    matchLabels:
      app: image-worker
  template:
    metadata:
      labels:
        app: image-worker
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "image-worker"
        dapr.io/app-port: "3001"
    spec:
      containers:
      - name: worker
        image: myregistry/image-worker:latest
        env:
        - name: WORKER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
```

## Configuring Concurrency

Limit how many messages a single worker processes simultaneously using the `app-max-concurrency` annotation:

```yaml
annotations:
  dapr.io/app-max-concurrency: "4"
```

## Dead Letter Topic for Failed Messages

Configure a dead letter topic to capture messages that fail after all retries:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: image-processing-sub
spec:
  topic: image-processing
  routes:
    default: /process
  pubsubname: task-queue
  deadLetterTopic: image-processing-dlq
```

## Summary

Implementing a work queue with Dapr Pub/Sub means publishing tasks to a topic and running multiple subscriber instances that each process a share of the messages. Dapr's consumer group behavior ensures each message goes to exactly one worker. Scale workers independently, configure concurrency limits, and use dead letter topics to handle persistent failures gracefully.
