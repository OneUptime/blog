# How to Configure RabbitMQ Exchange Types for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, RabbitMQ, Pub/Sub, Exchange, Messaging

Description: Configure RabbitMQ exchange types (direct, fanout, topic, headers) in Dapr pub/sub components to control message routing behavior.

---

## Overview

RabbitMQ supports four exchange types, each with different routing semantics. Dapr's RabbitMQ pub/sub component lets you specify the exchange type and other topology settings as metadata, giving you full control over message routing.

## Basic RabbitMQ Component

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
    value: "amqp://guest:guest@rabbitmq:5672"
  - name: exchangeKind
    value: "topic"
  - name: durable
    value: "true"
  - name: deletedWhenUnused
    value: "false"
  - name: prefetchCount
    value: "10"
```

## Exchange Types Explained

**Direct Exchange** - Routes messages to queues where the routing key exactly matches the binding key:

```yaml
  - name: exchangeKind
    value: "direct"
```

**Fanout Exchange** - Broadcasts to all bound queues, ignoring routing keys:

```yaml
  - name: exchangeKind
    value: "fanout"
```

**Topic Exchange** - Routes based on wildcard patterns (`*` matches one word, `#` matches zero or more):

```yaml
  - name: exchangeKind
    value: "topic"
```

**Headers Exchange** - Routes based on message header attributes:

```yaml
  - name: exchangeKind
    value: "headers"
```

## Topic Exchange with Wildcards

With `topic` exchange, use dotted topic names to leverage wildcard routing:

```go
// Publish to a specific topic
client.PublishEvent(ctx, "rabbitmq-pubsub", "orders.europe.paid", orderData)

// This matches subscriptions for:
// "orders.europe.paid" (exact)
// "orders.europe.*"    (one wildcard)
// "orders.#"           (multi-level wildcard)
```

## Configuring Subscription Metadata

Pass routing-specific metadata when subscribing:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-eu-sub
spec:
  pubsubname: rabbitmq-pubsub
  topic: orders.europe.paid
  routes:
    default: /handle-eu-order
  metadata:
    queueName: "eu-order-queue"
    routingKey: "orders.europe.paid"
```

## Dead Letter Configuration

Configure dead letter exchange for failed messages:

```yaml
  - name: enableDeadLetter
    value: "true"
  - name: maxLen
    value: "100000"
  - name: maxLenBytes
    value: "104857600"
```

## Verifying Exchange Topology

```bash
# Check exchanges via RabbitMQ management API
curl -u guest:guest http://rabbitmq:15672/api/exchanges/%2F | jq '.[].name'

# Check queue bindings
curl -u guest:guest http://rabbitmq:15672/api/bindings/%2F | jq '.[] | {source, destination, routing_key}'
```

## Summary

Dapr's RabbitMQ pub/sub component supports all four exchange types via the `exchangeKind` metadata field. Use `topic` exchanges for flexible wildcard routing in microservices, `fanout` for broadcast scenarios, and configure dead letter exchanges to capture unprocessable messages for later analysis.
