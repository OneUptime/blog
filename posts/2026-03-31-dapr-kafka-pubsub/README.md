# How to Configure Dapr with Apache Kafka Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Apache Kafka, Pub/Sub, Messaging, Microservice

Description: Learn how to configure Dapr with Apache Kafka as a pub/sub broker, enabling reliable, high-throughput event streaming between microservices.

---

## Overview

Apache Kafka is a distributed event streaming platform designed for high-throughput, durable message delivery. Using Kafka as a Dapr pub/sub broker gives your microservices access to Kafka's log-based messaging model, replay capabilities, and consumer groups. This guide walks through setting up Kafka and configuring Dapr to use it for pub/sub messaging.

## Prerequisites

- A running Kafka cluster (version 3.x recommended) or Confluent Platform
- Dapr CLI and runtime installed
- kubectl for Kubernetes deployments

## Deploying Kafka on Kubernetes

Use Strimzi, the Kubernetes-native Kafka operator:

```bash
# Install Strimzi operator
kubectl create namespace kafka
kubectl apply -f "https://strimzi.io/install/latest?namespace=kafka" -n kafka

# Deploy a Kafka cluster
kubectl apply -n kafka -f - <<EOF
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: dapr-kafka
spec:
  kafka:
    version: 3.6.0
    replicas: 3
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
    config:
      default.replication.factor: 3
      min.insync.replicas: 2
      log.retention.hours: 168
    storage:
      type: jbod
      volumes:
      - id: 0
        type: persistent-claim
        size: 20Gi
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 5Gi
  entityOperator:
    topicOperator: {}
    userOperator: {}
EOF
```

## Configuring the Dapr Kafka Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "dapr-kafka-kafka-bootstrap.kafka.svc.cluster.local:9092"
  - name: consumerGroup
    value: "dapr-consumer-group"
  - name: authType
    value: "none"
  - name: initialOffset
    value: "newest"
  - name: maxMessageBytes
    value: "1048576"
  - name: consumeRetryInterval
    value: "200ms"
```

For SASL authentication:

```yaml
  - name: authType
    value: "password"
  - name: saslUsername
    value: "dapr-user"
  - name: saslPassword
    secretKeyRef:
      name: kafka-secret
      key: password
  - name: saslMechanism
    value: "SCRAM-SHA-512"
```

Apply the component:

```bash
kubectl apply -f kafka-pubsub.yaml
```

## Publishing Events

Publish a message using the Dapr HTTP API:

```bash
curl -X POST http://localhost:3500/v1.0/publish/kafka-pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORD-2026-001", "amount": 49.99, "status": "placed"}'
```

Using the JavaScript SDK:

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

await client.pubsub.publish("kafka-pubsub", "orders", {
  orderId: "ORD-2026-002",
  amount: 129.99,
  status: "placed",
  items: [{ sku: "GADGET-X", qty: 1 }]
});
```

## Subscribing to Events

Create a Dapr subscription component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: orders-subscription
spec:
  pubsubname: kafka-pubsub
  topic: orders
  route: /handle-order
```

Handle events in your application:

```javascript
import express from "express";
const app = express();
app.use(express.json());

app.post("/handle-order", (req, res) => {
  const order = req.body.data;
  console.log("Received order:", order.orderId, "amount:", order.amount);
  // Process the order
  res.sendStatus(200);
});

app.listen(3000);
```

## Summary

Configuring Dapr with Apache Kafka as a pub/sub backend provides durable, high-throughput event streaming with consumer group semantics and message replay capability. Strimzi simplifies Kafka deployment on Kubernetes, and Dapr's component abstraction lets you switch messaging backends without changing application code.
