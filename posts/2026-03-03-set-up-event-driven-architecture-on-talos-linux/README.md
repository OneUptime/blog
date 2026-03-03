# How to Set Up Event-Driven Architecture on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Event-Driven Architecture, Kubernetes, Microservices, CQRS, DevOps

Description: Build an event-driven architecture on Talos Linux using Kubernetes-native tools including message brokers, event stores, and processing pipelines.

---

Event-driven architecture (EDA) is a design pattern where services communicate by producing and consuming events rather than making direct synchronous calls. This approach leads to loosely coupled, scalable systems that handle failures gracefully. Talos Linux provides an ideal foundation for event-driven systems because its immutable, API-driven nature aligns with the declarative, infrastructure-as-code approach that modern distributed systems demand.

This guide covers building an event-driven architecture on Talos Linux, including the messaging backbone, event processing, and patterns like CQRS and event sourcing.

## Why Event-Driven Architecture on Talos Linux

Traditional request-response architectures create tight coupling between services. When one service goes down, dependent services fail too. Event-driven architecture breaks this coupling. Producers emit events without knowing who will consume them, and consumers process events at their own pace. Talos Linux supports this by providing a reliable, consistent Kubernetes platform where each component of your event-driven system runs in isolation.

## Architecture Overview

A typical event-driven system on Kubernetes includes:

- **Event Broker**: The backbone for routing events (Kafka, NATS, or RabbitMQ)
- **Event Producers**: Services that emit events when something happens
- **Event Consumers**: Services that react to events
- **Event Store**: Optional persistent record of all events (for event sourcing)
- **API Gateway**: Entry point for external requests

## Step 1: Deploy the Event Broker

We will use NATS with JetStream as our event broker for its simplicity and performance:

```bash
# Install NATS with Helm
helm repo add nats https://nats-io.github.io/k8s/helm/charts/
kubectl create namespace events
```

```yaml
# nats-values.yaml
config:
  cluster:
    enabled: true
    replicas: 3
  jetstream:
    enabled: true
    memStorage:
      enabled: true
      size: "2Gi"
    fileStorage:
      enabled: true
      size: "20Gi"
      storageClassName: "local-path"

container:
  merge:
    resources:
      requests:
        memory: "1Gi"
        cpu: "500m"
```

```bash
helm install nats nats/nats --namespace events --values nats-values.yaml
```

## Step 2: Define Event Streams

Create streams for different event categories:

```bash
# Deploy NATS box for administration
kubectl run nats-admin --rm -it --restart=Never \
  --image=natsio/nats-box --namespace=events -- sh

# Inside the pod, create event streams
nats stream add ORDER_EVENTS \
  --subjects "orders.>" \
  --retention limits --max-age 72h \
  --storage file --replicas 3 \
  --server nats://nats:4222

nats stream add USER_EVENTS \
  --subjects "users.>" \
  --retention limits --max-age 168h \
  --storage file --replicas 3 \
  --server nats://nats:4222

nats stream add NOTIFICATION_EVENTS \
  --subjects "notifications.>" \
  --retention limits --max-age 24h \
  --storage file --replicas 3 \
  --server nats://nats:4222
```

## Step 3: Build an Event Producer Service

```yaml
# order-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: events
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
        - name: order-service
          image: node:20-alpine
          command: ["node", "/app/server.js"]
          env:
            - name: NATS_URL
              value: "nats://nats:4222"
            - name: PORT
              value: "3000"
          ports:
            - containerPort: 3000
          volumeMounts:
            - name: app-code
              mountPath: /app
      volumes:
        - name: app-code
          configMap:
            name: order-service-code
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: order-service-code
  namespace: events
data:
  server.js: |
    const http = require('http');
    const { connect, JSONCodec } = require('nats');

    const codec = JSONCodec();
    let nc;

    async function init() {
      // Connect to NATS
      nc = await connect({ servers: process.env.NATS_URL });
      console.log('Connected to NATS');

      // Get JetStream context
      const js = nc.jetstream();

      const server = http.createServer(async (req, res) => {
        if (req.method === 'POST' && req.url === '/orders') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', async () => {
            const order = JSON.parse(body);
            order.id = Date.now().toString();
            order.timestamp = new Date().toISOString();

            // Publish the event
            await js.publish(
              'orders.created',
              codec.encode(order)
            );

            console.log(`Order created: ${order.id}`);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ orderId: order.id, status: 'created' }));
          });
        }
      });

      server.listen(process.env.PORT, () => {
        console.log(`Order service listening on port ${process.env.PORT}`);
      });
    }

    init().catch(console.error);
  package.json: |
    {
      "dependencies": {
        "nats": "^2.19.0"
      }
    }
---
apiVersion: v1
kind: Service
metadata:
  name: order-service
  namespace: events
spec:
  selector:
    app: order-service
  ports:
    - port: 3000
      targetPort: 3000
```

## Step 4: Build Event Consumer Services

```yaml
# inventory-consumer.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inventory-consumer
  namespace: events
spec:
  replicas: 2
  selector:
    matchLabels:
      app: inventory-consumer
  template:
    metadata:
      labels:
        app: inventory-consumer
    spec:
      containers:
        - name: consumer
          image: node:20-alpine
          command: ["node", "/app/consumer.js"]
          env:
            - name: NATS_URL
              value: "nats://nats:4222"
            - name: CONSUMER_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          volumeMounts:
            - name: app-code
              mountPath: /app
      volumes:
        - name: app-code
          configMap:
            name: inventory-consumer-code
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: inventory-consumer-code
  namespace: events
data:
  consumer.js: |
    const { connect, JSONCodec, AckPolicy, DeliverPolicy } = require('nats');

    const codec = JSONCodec();

    async function main() {
      const nc = await connect({ servers: process.env.NATS_URL });
      const js = nc.jetstream();

      // Create a durable consumer
      const consumer = await js.consumers.get('ORDER_EVENTS', 'inventory-service');

      console.log('Inventory consumer started');

      // Process messages
      const messages = await consumer.consume();

      for await (const msg of messages) {
        try {
          const event = codec.decode(msg.data);
          const subject = msg.subject;

          if (subject === 'orders.created') {
            console.log(`Updating inventory for order: ${event.id}`);
            // Process inventory update here
            // ...
          }

          // Acknowledge successful processing
          msg.ack();
        } catch (err) {
          console.error(`Error processing message: ${err}`);
          // Negative acknowledge for retry
          msg.nak();
        }
      }
    }

    main().catch(console.error);
  package.json: |
    {
      "dependencies": {
        "nats": "^2.19.0"
      }
    }
```

## Step 5: Implement CQRS Pattern

CQRS (Command Query Responsibility Segregation) separates read and write models:

```yaml
# read-model-updater.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: read-model-updater
  namespace: events
spec:
  replicas: 1
  selector:
    matchLabels:
      app: read-model-updater
  template:
    metadata:
      labels:
        app: read-model-updater
    spec:
      containers:
        - name: updater
          image: node:20-alpine
          command: ["node", "/app/updater.js"]
          env:
            - name: NATS_URL
              value: "nats://nats:4222"
            - name: REDIS_URL
              value: "redis://redis:6379"
          volumeMounts:
            - name: app-code
              mountPath: /app
      volumes:
        - name: app-code
          configMap:
            name: read-model-code
```

The read model updater listens to events and updates a Redis-based read model that serves query requests. This separation allows the write side to focus on event generation while the read side optimizes for query patterns.

## Step 6: Dead Letter Queue Pattern

Handle failed events gracefully:

```bash
# Create a dead letter stream
nats stream add DEAD_LETTERS \
  --subjects "deadletter.>" \
  --retention limits --max-age 720h \
  --storage file --replicas 3 \
  --server nats://nats:4222
```

In your consumers, after a maximum number of retries, publish failed events to the dead letter stream for manual investigation.

## Step 7: Monitoring Event Flow

Deploy a monitoring stack to track event throughput and consumer lag:

```yaml
# event-monitor.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nats-surveyor
  namespace: events
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nats-surveyor
  template:
    metadata:
      labels:
        app: nats-surveyor
    spec:
      containers:
        - name: surveyor
          image: natsio/nats-surveyor:latest
          args:
            - -s
            - nats://nats:4222
            - --accounts
            - --observe
            - ">"
          ports:
            - containerPort: 7777
```

## Design Principles

When building event-driven systems on Talos Linux, follow these principles:

- **Events should be immutable facts**: An event represents something that happened. Never modify past events.
- **Design for idempotency**: Consumers may process the same event more than once. Make sure processing is idempotent.
- **Use schemas for events**: Define clear schemas for your events to prevent breaking changes.
- **Monitor consumer lag**: If consumers fall behind, you need to know quickly.
- **Plan for replay**: The ability to replay events from a point in time is a powerful debugging and recovery tool.

## Conclusion

Event-driven architecture on Talos Linux gives you a scalable, resilient foundation for microservices communication. The combination of NATS JetStream for messaging, Kubernetes for orchestration, and Talos Linux for the OS layer creates a stack that is both powerful and manageable. Start with simple pub-sub patterns, add consumer groups for parallel processing, and evolve toward CQRS and event sourcing as your needs grow. The declarative nature of both Talos Linux and Kubernetes means your entire event-driven infrastructure can be version-controlled and reproduced consistently.
