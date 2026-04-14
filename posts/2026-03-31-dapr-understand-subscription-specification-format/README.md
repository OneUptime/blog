# How to Understand Dapr Subscription Specification Format

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Subscription, YAML, Specification

Description: Learn how to write Dapr subscription YAML files, configure topic routing, set dead-letter topics, and apply scopes for declarative pub/sub subscriptions.

---

Dapr supports both programmatic and declarative subscriptions. Declarative subscriptions use YAML files and are applied once - the Dapr sidecar reads them at startup to wire up pub/sub routing without application code changes.

## Basic Subscription Format

A minimal subscription YAML requires the pub/sub component name, topic, and route:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-sub
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /orders
```

- `spec.pubsubname` - The name of the Dapr pub/sub component
- `spec.topic` - The topic name to subscribe to
- `spec.routes.default` - The HTTP endpoint on your app that receives messages

## Content-Based Routing

Use the `routes.rules` field to route messages to different endpoints based on CloudEvents attributes:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-sub
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    rules:
      - match: event.type == "order.created"
        path: /orders/new
      - match: event.type == "order.cancelled"
        path: /orders/cancel
    default: /orders/unknown
```

The `match` expression uses the Common Expression Language (CEL) to evaluate CloudEvent fields.

## Dead-Letter Topics

Configure a dead-letter topic to capture messages that fail processing repeatedly:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-sub
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /orders
  deadLetterTopic: orders-dlq
```

Messages exceeding the retry policy of the resiliency spec are forwarded to `orders-dlq` for inspection and reprocessing.

## Bulk Subscriptions

Enable bulk delivery to receive multiple messages in a single request for higher throughput:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-sub
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /orders
  bulkSubscribe:
    enabled: true
    maxMessagesCount: 100
    maxAwaitDurationMs: 40
```

Your app receives a `BulkSubscribeRequest` body containing an array of messages:

```json
{
  "entries": [
    {"entryId": "1", "event": {...}, "contentType": "application/json"},
    {"entryId": "2", "event": {...}, "contentType": "application/json"}
  ]
}
```

## Scoping Subscriptions to Applications

Add `scopes` to restrict which app IDs can use this subscription:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-sub
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /orders
scopes:
  - order-processor
```

## Applying Subscriptions

```bash
# Kubernetes
kubectl apply -f subscription.yaml -n dapr-demo

# Self-hosted - place in components directory
cp subscription.yaml ~/.dapr/components/
```

## Summary

Dapr subscription YAML uses `apiVersion: dapr.io/v2alpha1` and the `Subscription` kind. The `spec` section wires a pub/sub component topic to an application route, with support for CEL-based content routing, dead-letter topics, bulk delivery, and application scoping.
