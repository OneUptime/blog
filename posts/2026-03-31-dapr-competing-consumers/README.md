# How to Implement Competing Consumers with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Competing Consumer, Pub/Sub, Scalability, Pattern

Description: Learn how to implement the competing consumers pattern with Dapr pub/sub to scale message processing horizontally across multiple service instances.

---

## Overview

The competing consumers pattern scales message processing by having multiple instances of the same consumer compete to process messages from a shared queue. Each message is processed by exactly one consumer. Dapr's pub/sub building block implements this naturally through consumer groups.

## Consumer Group Configuration

Configure Dapr's pub/sub component with a consumer group:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka:9092"
    - name: consumerGroup
      value: "order-processors"  # All instances share this group
    - name: initialOffset
      value: "newest"
```

When multiple pods subscribe with the same `consumerGroup`, Kafka distributes partitions among them - achieving competing consumers automatically.

## Consumer Service

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "os"
    daprd "github.com/dapr/go-sdk/service/http"
    "github.com/dapr/go-sdk/service/common"
)

var instanceID = os.Getenv("POD_NAME")

func main() {
    s := daprd.NewService(":8080")

    sub := &common.Subscription{
        PubsubName: "order-pubsub",
        Topic:      "orders",
        Route:      "/process-order",
    }

    s.AddTopicEventHandler(sub, processOrder)
    log.Printf("Consumer %s starting", instanceID)
    s.Start()
}

type Order struct {
    ID         string  `json:"id"`
    CustomerID string  `json:"customerId"`
    Total      float64 `json:"total"`
}

func processOrder(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var order Order
    if err := json.Unmarshal(e.RawData, &order); err != nil {
        return false, err
    }

    log.Printf("[%s] Processing order %s (total: $%.2f)", instanceID, order.ID, order.Total)

    // Simulate processing time
    if err := fulfillOrder(ctx, order); err != nil {
        log.Printf("[%s] Failed to process order %s: %v", instanceID, order.ID, err)
        return true, err // Retry
    }

    log.Printf("[%s] Order %s completed", instanceID, order.ID)
    return false, nil
}
```

## Scaling Consumers

Deploy multiple replicas:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-consumer
spec:
  replicas: 5  # 5 competing consumers
  selector:
    matchLabels:
      app: order-consumer
  template:
    metadata:
      labels:
        app: order-consumer
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-consumer"
        dapr.io/app-port: "8080"
        dapr.io/app-max-concurrency: "10"  # Per-instance concurrency
    spec:
      containers:
        - name: order-consumer
          image: myregistry/order-consumer:latest
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
```

## Auto-scaling with KEDA

Scale consumers automatically based on queue depth:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-consumer-scaler
spec:
  scaleTargetRef:
    name: order-consumer
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka:9092
        consumerGroup: order-processors
        topic: orders
        lagThreshold: "50"  # Scale up when lag exceeds 50 messages
```

## Message Acknowledgment and Retry

Dapr handles acknowledgment automatically:

```go
func processOrder(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var order Order
    json.Unmarshal(e.RawData, &order)

    err := processWithDB(ctx, order)
    if err != nil {
        if isRetryableError(err) {
            return true, err  // Nack: Dapr will redeliver
        }
        // Non-retryable: send to dead letter, don't retry
        sendToDeadLetter(order, err)
        return false, nil
    }

    return false, nil  // Ack: message processed successfully
}
```

## Summary

Dapr pub/sub with consumer groups implements the competing consumers pattern out of the box. Multiple replicas subscribing to the same topic with the same consumer group each receive a distinct subset of messages, enabling horizontal scale-out. KEDA integration allows automatic scaling based on queue depth, and Dapr's retry semantics ensure reliable processing.
