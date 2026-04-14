# How to Migrate Between Pub/Sub Brokers in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Migration, Kafka, RabbitMQ, Broker, DevOps, Microservice

Description: Migrate your Dapr pub/sub configuration between different message brokers with zero code changes, using a phased approach to minimize risk.

---

## Overview

One of Dapr's core value propositions is that it abstracts pub/sub broker specifics behind a standard API. Migrating between brokers requires only component YAML changes - your application code stays identical. However, a safe migration still requires careful planning to avoid message loss during the transition. This guide covers strategies for migrating between Dapr pub/sub brokers.

## Migration Strategies

### Strategy 1: Big Bang (Simple but Risky)

Stop all consumers, drain the source broker, update the component YAML, restart services.

Best for: Development environments, topics with low traffic, or where replaying from source is acceptable.

### Strategy 2: Dual Publishing (Safe but Complex)

Temporarily publish to both brokers during migration, then cut over consumers.

Best for: Production systems with strict no-message-loss requirements.

### Strategy 3: Rolling Consumer Migration

Migrate consumers first (reading from both), then cut publishers.

## Step-by-Step: Kafka to Azure Service Bus Migration

### Step 1: Assess Current State

```bash
# Check current Kafka consumer lag
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --group order-processor

# Document all topics
kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --list
```

### Step 2: Create Target Broker Resources

```bash
az servicebus namespace create \
  --name dapr-migration-target \
  --resource-group dapr-demo \
  --sku Standard

az servicebus topic create \
  --name orders \
  --namespace-name dapr-migration-target \
  --resource-group dapr-demo
```

### Step 3: Deploy New Component YAML

Create a second component alongside the existing one:

```yaml
# kafka-pubsub.yaml (existing)
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka:9092"
    - name: authType
      value: "none"
    - name: consumerGroup
      value: "order-processor"
---
# servicebus-pubsub.yaml (new)
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: servicebus-pubsub
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: servicebus-secret
        key: connectionString
```

### Step 4: Dual Publishing in Application Code

Temporarily modify publishers to write to both brokers:

```python
import requests

def publish_order(order):
    # Publish to both brokers
    requests.post("http://localhost:3500/v1.0/publish/kafka-pubsub/orders",
                  json=order)
    requests.post("http://localhost:3500/v1.0/publish/servicebus-pubsub/orders",
                  json=order)
```

### Step 5: Migrate Consumers

Update subscription component name while keeping the handler identical:

```yaml
# Before
spec:
  pubsubname: kafka-pubsub
  topic: orders
  route: /orders

# After
spec:
  pubsubname: servicebus-pubsub
  topic: orders
  route: /orders
```

### Step 6: Drain and Cut Over Publishers

```bash
# Wait for Kafka consumer lag to reach zero
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --group order-processor | grep -v "0$"

# Remove dual publishing from application code
# Update publisher subscriptions to only use servicebus-pubsub
```

### Step 7: Remove Old Component

```bash
kubectl delete component kafka-pubsub
```

## Testing the Migration

```bash
# Publish a test message to new broker
curl -X POST http://localhost:3500/v1.0/publish/servicebus-pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "MIGRATION-TEST-001"}'

# Verify your application received it
kubectl logs -l app=order-processor | grep "MIGRATION-TEST-001"
```

## Summary

Migrating Dapr pub/sub brokers requires zero application code changes because Dapr abstracts broker specifics. Use dual publishing for production migrations to avoid message loss during the cutover window. After validating that consumers on the new broker are healthy and consumer lag on the old broker reaches zero, remove dual publishing and delete the old component.
