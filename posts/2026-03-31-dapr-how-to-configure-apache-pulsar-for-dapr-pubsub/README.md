# How to Configure Apache Pulsar for Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Apache Pulsar, Pub/Sub, Messaging, Kubernetes

Description: Set up Apache Pulsar as the Dapr pub/sub backend with topic partitioning, tenant isolation, and authentication configuration.

---

## Overview

Apache Pulsar is an enterprise-grade messaging platform with multi-tenancy, geo-replication, and tiered storage. As a Dapr pub/sub backend, Pulsar provides persistent topics, partitioned message delivery, and schema enforcement. This guide covers deploying Pulsar and configuring Dapr to use it.

## Deploy Apache Pulsar on Kubernetes

Using Helm:

```bash
helm repo add apache https://pulsar.apache.org/charts
helm repo update

helm install pulsar apache/pulsar \
  --namespace pulsar \
  --create-namespace \
  --set initialize=true \
  --set components.functions=false \
  --set monitoring.prometheus=false \
  --set monitoring.grafana=false \
  --timeout 10m
```

Wait for Pulsar to be ready:

```bash
kubectl wait --for=condition=ready pod -l component=broker \
  -n pulsar --timeout=300s
```

For local Docker development:

```bash
docker run -d \
  --name pulsar \
  -p 6650:6650 \
  -p 8080:8080 \
  apachepulsar/pulsar:3.1.0 \
  bin/pulsar standalone
```

## Basic Dapr Component Configuration

```yaml
# components/pubsub-pulsar.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.pulsar
  version: v1
  metadata:
  - name: host
    value: "pulsar://pulsar-broker.pulsar.svc.cluster.local:6650"
  - name: enableTLS
    value: "false"
  - name: tenant
    value: "public"
  - name: namespace
    value: "default"
  - name: persistent
    value: "true"
  - name: disableBatching
    value: "false"
```

## Advanced Configuration with Authentication

For production environments with JWT authentication:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: production
spec:
  type: pubsub.pulsar
  version: v1
  metadata:
  - name: host
    value: "pulsar+ssl://pulsar-broker.pulsar.svc.cluster.local:6651"
  - name: enableTLS
    value: "true"
  - name: token
    secretKeyRef:
      name: pulsar-jwt-secret
      key: token
  - name: tenant
    value: "my-company"
  - name: namespace
    value: "orders"
  - name: persistent
    value: "true"
  - name: receiverQueueSize
    value: "1000"
  - name: maxConcurrentHandlers
    value: "10"
```

## Publisher Example

```java
// OrderPublisher.java
package com.example;

import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import java.util.Map;

public class OrderPublisher {

    public static void main(String[] args) throws Exception {
        try (DaprClient client = new DaprClientBuilder().build()) {

            for (int i = 0; i < 50; i++) {
                Map<String, Object> order = Map.of(
                    "orderId", String.format("order-%04d", i),
                    "productId", "prod-001",
                    "quantity", i + 1,
                    "region", "us-east-1"
                );

                client.publishEvent("pubsub", "orders", order)
                    .block();

                System.out.printf("Published order-%04d%n", i);
                Thread.sleep(100);
            }
        }
    }
}
```

## Subscriber with Partitioning

```javascript
// subscriber/app.js
const express = require('express');
const app = express();
app.use(express.json());

// Dapr routes multiple partitions to the same handler
app.get('/dapr/subscribe', (req, res) => {
  res.json([
    {
      pubsubname: 'pubsub',
      topic: 'orders',
      route: '/orders',
      metadata: {
        // Optional: consumer name for tracking
        consumerName: `order-processor-${process.env.HOSTNAME}`
      }
    }
  ]);
});

app.post('/orders', async (req, res) => {
  const { data, topic, pubsubname } = req.body;

  console.log(`[${pubsubname}/${topic}] Processing: ${data.orderId}`);

  try {
    await processOrder(data);
    res.sendStatus(200);
  } catch (error) {
    console.error(`Failed: ${error.message}`);
    res.sendStatus(500);
  }
});

async function processOrder(order) {
  // Simulate async processing
  await new Promise(resolve => setTimeout(resolve, 50));
  console.log(`Completed order ${order.orderId} in region ${order.region}`);
}

app.listen(3000, () => console.log('Subscriber ready on port 3000'));
```

## Pulsar Topic Management

Create topics and set retention policies via Pulsar CLI:

```bash
# Port-forward Pulsar admin
kubectl port-forward svc/pulsar-broker 8080:8080 -n pulsar

# Create a namespace with retention
bin/pulsar-admin namespaces create my-company/orders

# Set retention (keep for 7 days or 10GB)
bin/pulsar-admin namespaces set-retention my-company/orders \
  --size 10G \
  --time 7d

# Create partitioned topic
bin/pulsar-admin topics create-partitioned-topic \
  persistent://my-company/orders/orders \
  --partitions 4

# List topics
bin/pulsar-admin topics list my-company/orders

# Check topic stats
bin/pulsar-admin topics stats persistent://my-company/orders/orders
```

## Multi-Tenant Configuration

Pulsar supports multi-tenancy for environment isolation:

```bash
# Create tenants for different environments
bin/pulsar-admin tenants create staging \
  --admin-roles staging-admin \
  --allowed-clusters standalone

bin/pulsar-admin tenants create production \
  --admin-roles prod-admin \
  --allowed-clusters standalone

# Create separate namespaces
bin/pulsar-admin namespaces create staging/orders
bin/pulsar-admin namespaces create production/orders
```

Update the Dapr component per environment:

```yaml
# staging component
metadata:
- name: tenant
  value: "staging"
- name: namespace
  value: "orders"
---
# production component
metadata:
- name: tenant
  value: "production"
- name: namespace
  value: "orders"
```

## Dead Letter Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: orders-subscription
spec:
  pubsubname: pubsub
  topic: orders
  route: /orders
  deadLetterTopic: orders-dead-letter
```

## Summary

Apache Pulsar as a Dapr pub/sub backend provides enterprise features like multi-tenancy, partitioned topics, and tiered storage that Redis or NATS cannot match. The Dapr Pulsar component exposes the most important Pulsar configuration through metadata fields, allowing you to control partitioning, persistence, and TLS without writing broker-specific code. Multi-tenant namespaces make it easy to isolate topics between staging and production environments using the same Pulsar cluster.
