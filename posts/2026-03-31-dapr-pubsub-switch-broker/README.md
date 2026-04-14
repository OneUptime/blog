# How to Switch Pub/Sub Brokers Without Changing Application Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Portability, Configuration, Microservice

Description: Learn how Dapr's component abstraction lets you swap pub/sub brokers from Redis to Kafka to RabbitMQ by changing only YAML configuration, not application code.

---

## The Problem with Broker Lock-In

When applications use broker-specific SDKs directly, switching from RabbitMQ to Kafka requires rewriting connection logic, serialization, and subscription management. Dapr eliminates this by abstracting the broker behind a standard API.

## How Dapr's Abstraction Works

Your application always calls the same Dapr HTTP or gRPC endpoint regardless of the underlying broker:

```text
POST http://localhost:3500/v1.0/publish/{pubsubname}/{topic}
```

The `pubsubname` maps to a component definition. Change the component YAML and the broker changes transparently.

## Start with Redis for Development

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
```

Your application code:

```python
import requests

def publish_order(order):
    requests.post(
        "http://localhost:3500/v1.0/publish/pubsub/orders",
        json=order,
        headers={"Content-Type": "application/json"},
    )

def subscribe():
    # Flask route - Dapr will POST here
    pass  # Handler code stays identical across brokers
```

## Switch to RabbitMQ for Staging

Replace only the component file - zero application code changes:

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: connectionString
    value: amqp://guest:guest@rabbitmq:5672
  - name: durable
    value: "true"
  - name: autoAck
    value: "false"
```

## Switch to Kafka for Production

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: kafka-broker:9092
  - name: consumerGroup
    value: order-service
  - name: authType
    value: "none"
```

On Kubernetes, apply the updated component and restart the deployment:

```bash
kubectl apply -f components/pubsub.yaml
kubectl rollout restart deployment/order-service
```

## Using Environment-Specific Component Directories

Organize components by environment:

```text
components/
  dev/pubsub.yaml      # Redis
  staging/pubsub.yaml  # RabbitMQ
  prod/pubsub.yaml     # Kafka
```

Run with the appropriate directory:

```bash
# Development
dapr run --resources-path ./components/dev -- python app.py

# Production (Kubernetes uses namespace-scoped components)
kubectl apply -f components/prod/
```

## What Stays the Same

Regardless of the broker, the following remain unchanged:
- Publish HTTP calls
- Subscribe endpoint paths
- CloudEvents message envelope format
- Dead-letter topic configuration
- Retry and resiliency policies

## Summary

Dapr's pub/sub component abstraction lets you switch brokers by updating YAML configuration files, with no application code changes required. This portability is valuable for testing locally with Redis while running Kafka in production, or for migrating brokers without a rewrite.
