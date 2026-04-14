# How to Configure Dapr with RabbitMQ Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, RabbitMQ, Pub/Sub, Messaging, AMQP

Description: Learn how to configure Dapr with RabbitMQ as a pub/sub broker, using RabbitMQ's AMQP-based messaging for reliable, flexible event-driven microservice communication.

---

## Overview

RabbitMQ is a widely adopted open-source message broker implementing the AMQP protocol. It supports flexible routing with exchanges, durable queues, dead-letter queues, and message TTL. Using RabbitMQ as a Dapr pub/sub backend gives your microservices access to these robust messaging features through Dapr's simple publish-subscribe API.

## Prerequisites

- A running RabbitMQ instance (version 3.11 or later)
- Dapr CLI and runtime installed
- kubectl for Kubernetes deployments

## Deploying RabbitMQ on Kubernetes

Use the RabbitMQ Cluster Kubernetes Operator:

```bash
kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"

# Pre-create the default user Secret so the operator uses your credentials
kubectl create secret generic dapr-rabbitmq-default-user \
  --from-literal=username=dapr \
  --from-literal=password=rabbitpassword \
  --from-literal=host=dapr-rabbitmq.default.svc.cluster.local \
  --from-literal=port="5672"

kubectl apply -f - <<EOF
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: dapr-rabbitmq
  namespace: default
spec:
  replicas: 3
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 1
      memory: 2Gi
  persistence:
    storage: 10Gi
  rabbitmq:
    additionalConfig: |
      default_vhost = /
EOF
```

## Configuring the Dapr RabbitMQ Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rabbitmq-pubsub
  namespace: default
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: connectionString
    value: "amqp://dapr:rabbitpassword@dapr-rabbitmq.default.svc.cluster.local:5672"
  - name: durable
    value: "true"
  - name: deletedWhenUnused
    value: "false"
  - name: autoAck
    value: "false"
  - name: deliveryMode
    value: "2"
  - name: requeueInFailure
    value: "false"
  - name: prefetchCount
    value: "10"
  - name: reconnectWaitSeconds
    value: "5"
  - name: maxLen
    value: "0"
  - name: exchangeKind
    value: "fanout"
```

Key settings:
- `durable: true` persists queues across broker restarts
- `autoAck: false` requires explicit acknowledgment (at-least-once delivery)
- `deliveryMode: 2` marks messages as persistent (written to disk)

Apply the component:

```bash
kubectl apply -f rabbitmq-pubsub.yaml
```

## Publishing Messages

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Publish an invoice event
await client.pubsub.publish("rabbitmq-pubsub", "invoices", {
  invoiceId: "INV-2026-00421",
  customerId: "CUST-8841",
  amount: 2350.00,
  dueDate: "2026-04-15",
  lineItems: [
    { description: "Professional Services", qty: 10, rate: 235.00 }
  ]
});
```

## Subscribing to Events

Create a subscription manifest:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: invoice-subscription
spec:
  pubsubname: rabbitmq-pubsub
  topic: invoices
  route: /process-invoice
  deadLetterTopic: invoices-dlq
```

Handle events in your service:

```javascript
app.post("/process-invoice", async (req, res) => {
  const invoice = req.body.data;
  try {
    await generatePDF(invoice);
    await sendToCustomer(invoice.customerId, invoice.invoiceId);
    res.sendStatus(200); // Acknowledge
  } catch (err) {
    console.error("Failed to process invoice:", err);
    res.sendStatus(500); // Nack - requeue or send to DLQ
  }
});
```

## Dead Letter Queue Setup

Configure RabbitMQ DLQ for failed message handling:

```bash
# Create DLQ queue via rabbitmqadmin (requires the management plugin)
rabbitmqadmin -u dapr -p rabbitpassword declare queue name=invoices-dlq durable=true
```

## Summary

RabbitMQ as a Dapr pub/sub broker provides flexible, reliable messaging with AMQP semantics. Key Dapr configurations - `durable`, `autoAck`, and `deliveryMode` - ensure messages survive broker restarts and require explicit acknowledgment, providing at-least-once delivery guarantees with dead-letter queue support for failed messages.
