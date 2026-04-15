# How to Use Dapr with Confluent Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kafka, Confluent, Pub/Sub, Microservice

Description: Learn how to configure Dapr's pub/sub component with Confluent Kafka to build reliable event-driven microservices with schema registry support.

---

## Overview

Confluent Kafka is an enterprise-grade Kafka distribution that adds schema registry, connectors, and enhanced security. Dapr's pub/sub building block makes it straightforward to integrate Confluent Kafka without coupling your application code to Kafka client libraries.

## Prerequisites

- A running Confluent Kafka cluster (Cloud or self-hosted)
- Dapr CLI installed and initialized
- A Kubernetes cluster or local Docker environment

## Configuring the Dapr Pub/Sub Component

Create a Dapr component manifest pointing to your Confluent Kafka broker:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: confluent-pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "pkc-xxxxx.us-east-1.aws.confluent.cloud:9092"
    - name: authType
      value: "password"
    - name: saslUsername
      value: "API_KEY"
    - name: saslPassword
      secretKeyRef:
        name: confluent-secret
        key: apiSecret
    - name: saslMechanism
      value: "PLAINTEXT"
    - name: initialOffset
      value: "newest"
    - name: consumerGroup
      value: "dapr-orders-group"
```

Store your Confluent API secret in a Kubernetes secret:

```bash
kubectl create secret generic confluent-secret \
  --from-literal=apiSecret=YOUR_CONFLUENT_API_SECRET
```

## Publishing Messages

Use the Dapr HTTP API to publish an order event:

```bash
curl -X POST http://localhost:3500/v1.0/publish/confluent-pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ord-001", "customerId": "cust-123", "total": 99.99}'
```

From a Go service:

```go
package main

import (
    "context"
    "encoding/json"
    dapr "github.com/dapr/go-sdk/client"
)

func publishOrder(orderID string, total float64) error {
    client, err := dapr.NewClient()
    if err != nil {
        return err
    }
    defer client.Close()

    data, err := json.Marshal(map[string]interface{}{
        "orderId": orderID,
        "total":   total,
    })
    if err != nil {
        return err
    }
    return client.PublishEvent(context.Background(), "confluent-pubsub", "orders", data)
}
```

## Subscribing to Messages

Define a programmatic subscription in your service:

```go
func main() {
    s := daprd.NewService(":6001")

    sub := &common.Subscription{
        PubsubName: "confluent-pubsub",
        Topic:      "orders",
        Route:      "/orders",
    }
    s.AddTopicEventHandler(sub, orderHandler)
    s.Start()
}

func orderHandler(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
    log.Printf("Received order: %s", e.Data)
    // Process the order
    return false, nil
}
```

## Using Confluent Schema Registry

To enforce Avro schemas, set the schema registry URL in your component:

```yaml
    - name: schemaRegistryURL
      value: "https://psrc-xxxxx.us-east-2.aws.confluent.cloud"
    - name: schemaRegistryAPIKey
      value: "SR_API_KEY"
    - name: schemaRegistryAPISecret
      secretKeyRef:
        name: confluent-secret
        key: srApiSecret
```

## Dead Letter Topics

Configure a dead-letter topic in a declarative subscription for failed messages:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
spec:
  pubsubname: confluent-pubsub
  topic: orders
  route: /orders
  deadLetterTopic: orders-dead-letter
```

Dapr will automatically route messages that exhaust retries to this topic, allowing for separate reprocessing logic. It is recommended to pair this with a retry resiliency policy so messages are retried before being sent to the dead letter topic.

## Summary

Dapr integrates with Confluent Kafka through the pub/sub component, abstracting broker-specific client libraries from your application code. By configuring SASL authentication and optionally schema registry support, you get enterprise-grade messaging with minimal boilerplate. Dead-letter topics and consumer groups round out the production-ready setup.
