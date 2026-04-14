# How to Configure Solace AMQP for Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Solace, AMQP, Pub/Sub, Messaging, Enterprise

Description: Configure Solace PubSub+ as a Dapr pub/sub component using AMQP for enterprise-grade messaging with guaranteed delivery.

---

## Overview

Solace PubSub+ is an enterprise messaging platform supporting AMQP, MQTT, JMS, and REST protocols. Dapr connects to Solace via the AMQP 1.0 protocol, making it suitable for organizations that already run Solace for mission-critical messaging workloads.

## Setting Up Solace PubSub+

Deploy Solace PubSub+ Standard edition using Docker:

```bash
docker run -d \
  --name solace \
  -p 8080:8080 \
  -p 55555:55555 \
  -p 5672:5672 \
  -p 9000:9000 \
  -e username_admin_globalaccesslevel=admin \
  -e username_admin_password=admin \
  --shm-size=1g \
  solace/solace-pubsub-standard:latest
```

Configure topics and queues using the SEMP REST API:

```bash
# Create a queue for the orders topic
curl -X POST http://localhost:8080/SEMP/v2/config/msgVpns/default/queues \
  -u admin:admin \
  -H "Content-Type: application/json" \
  -d '{
    "queueName": "orders",
    "accessType": "non-exclusive",
    "permission": "consume",
    "ingressEnabled": true,
    "egressEnabled": true
  }'

# Add a topic subscription to the queue
curl -X POST \
  "http://localhost:8080/SEMP/v2/config/msgVpns/default/queues/orders/subscriptions" \
  -u admin:admin \
  -H "Content-Type: application/json" \
  -d '{"subscriptionTopic": "orders/>"}'
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: solace-pubsub
  namespace: default
spec:
  type: pubsub.solace.amqp
  version: v1
  metadata:
  - name: url
    value: "amqp://localhost:5672"
  - name: username
    secretKeyRef:
      name: solace-secret
      key: username
  - name: password
    secretKeyRef:
      name: solace-secret
      key: password
  - name: caCert
    secretKeyRef:
      name: solace-tls-secret
      key: caCert
```

Create the Kubernetes secret:

```bash
kubectl create secret generic solace-secret \
  --from-literal=username=default \
  --from-literal=password=default
```

## Publishing with Topic Hierarchy

Solace supports hierarchical topic addressing, which maps to Dapr topic names:

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();

async function publishOrderEvent(region, customerId, order) {
  // Topic: orders/us-east/cust-123
  const topic = `orders/${region}/${customerId}`;

  await client.pubsub.publish('solace-pubsub', topic, {
    orderId: order.id,
    amount: order.amount,
    region: region
  });
}

publishOrderEvent('us-east', 'cust-123', { id: 'ord-001', amount: 250.00 });
```

## Wildcard Subscriptions

Subscribe to all orders using wildcard patterns:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: all-orders-subscription
spec:
  pubsubname: solace-pubsub
  topic: "orders/>"
  route: /orders/process
```

## TLS Configuration for Production

```yaml
  - name: url
    value: "amqps://solace.company.com:5671"
  - name: caCert
    secretKeyRef:
      name: solace-tls
      key: ca.crt
  - name: clientCert
    secretKeyRef:
      name: solace-tls
      key: tls.crt
  - name: clientKey
    secretKeyRef:
      name: solace-tls
      key: tls.key
```

## Summary

Solace AMQP with Dapr bridges enterprise messaging infrastructure with cloud-native microservices. The hierarchical topic model and wildcard subscriptions enable sophisticated routing patterns without additional configuration. For organizations already invested in Solace, this integration provides a smooth migration path to microservices while preserving existing messaging topology.
