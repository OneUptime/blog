# How to Configure Dapr with NATS JetStream Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, NATS, JetStream, Pub/Sub, Messaging

Description: Learn how to configure Dapr with NATS JetStream as a pub/sub broker, leveraging JetStream's durable, at-least-once messaging with consumer groups for microservices.

---

## Overview

NATS JetStream is the persistence layer of NATS, providing durable, subject-based messaging with consumer groups, replay, and at-least-once delivery. Compared to core NATS (fire-and-forget), JetStream adds the reliability needed for production microservice messaging. Dapr's JetStream pub/sub component integrates seamlessly with NATS JetStream for reliable event-driven communication.

## Prerequisites

- NATS server (version 2.2 or later) with JetStream enabled
- Dapr CLI and runtime installed
- nats CLI for verification

## Deploying NATS with JetStream on Kubernetes

Use the official NATS Helm chart:

```bash
helm repo add nats https://nats-io.github.io/k8s/helm/charts
helm repo update

helm install nats nats/nats \
  --set config.jetstream.enabled=true \
  --set config.jetstream.fileStore.enabled=true \
  --set config.jetstream.fileStore.pvc.size=10Gi \
  --set config.cluster.enabled=true \
  --set config.cluster.replicas=3 \
  --namespace nats \
  --create-namespace
```

Verify JetStream is available:

```bash
kubectl exec -n nats nats-0 -- \
  nats server info --server nats://localhost:4222 | grep JetStream
```

## Configuring the Dapr NATS JetStream Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: jetstream-pubsub
  namespace: default
spec:
  type: pubsub.jetstream
  version: v1
  metadata:
  - name: natsURL
    value: "nats://nats.nats.svc.cluster.local:4222"
  - name: name
    value: "dapr-jetstream"
  - name: durableName
    value: "dapr-durable"
  - name: streamName
    value: "DAPR_EVENTS"
  - name: deliverPolicy
    value: "new"
  - name: startSequence
    value: "0"
  - name: ackWait
    value: "30s"
  - name: maxDeliver
    value: "5"
  - name: backOff
    value: "1s,2s,4s,8s,16s"
```

The `backOff` field configures exponential retry intervals for failed message redelivery.

Apply the component:

```bash
kubectl apply -f jetstream-pubsub.yaml
```

## Publishing and Subscribing

Publish events using the Dapr SDK:

```javascript
import { DaprClient, DaprServer } from "@dapr/dapr";

const client = new DaprClient();

// Publish a payment event
await client.pubsub.publish("jetstream-pubsub", "payments", {
  paymentId: "PAY-8821",
  userId: "user-4421",
  amount: 89.50,
  currency: "USD",
  method: "card",
  timestamp: new Date().toISOString()
});
```

Subscribe with a durable consumer:

```javascript
const server = new DaprServer({ serverHost: "127.0.0.1", serverPort: "3001" });

await server.pubsub.subscribe("jetstream-pubsub", "payments", async (payment) => {
  console.log(`Processing payment ${payment.paymentId} for $${payment.amount}`);
  await processPaymentRecord(payment);
});

await server.start();
```

## Monitoring JetStream Consumers

```bash
# Check stream and consumer status
nats --server nats://localhost:4222 stream info DAPR_EVENTS

# Check consumer lag
nats --server nats://localhost:4222 consumer info DAPR_EVENTS dapr-durable

# View unacknowledged messages
nats --server nats://localhost:4222 consumer next DAPR_EVENTS dapr-durable --count 5
```

## Replaying Messages

JetStream allows replaying messages from a specific sequence or time, useful for recovering from consumer failures:

```yaml
  - name: deliverPolicy
    value: "all"
  - name: startSequence
    value: "0"
```

## Summary

NATS JetStream as a Dapr pub/sub backend provides cloud-native, lightweight messaging with durable consumers, configurable retry backoff, and message replay. Its low resource footprint compared to Kafka makes it ideal for microservice deployments where operational simplicity matters alongside reliability.
