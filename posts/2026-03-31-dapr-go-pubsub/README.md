# How to Use Dapr Pub/Sub with Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, Pub Sub, Messaging, Microservice, Event Driven

Description: Publish and subscribe to events in Go microservices using the Dapr pub/sub building block with CloudEvents, topic routing, and reliable delivery.

---

## Overview

Dapr pub/sub decouples Go microservices through a broker-agnostic messaging API. Producers publish events, and consumers subscribe to topics. The Dapr sidecar handles CloudEvents wrapping, delivery retries, and dead-lettering independently of the broker (Kafka, Redis Streams, Azure Service Bus, etc.).

## Publishing Events

```go
package main

import (
    "context"
    "log"

    dapr "github.com/dapr/go-sdk/client"
)

type OrderPlaced struct {
    OrderID  string  `json:"orderId"`
    Product  string  `json:"product"`
    Amount   float64 `json:"amount"`
    Customer string  `json:"customer"`
}

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    ctx := context.Background()

    event := OrderPlaced{
        OrderID:  "ord-001",
        Product:  "Widget Pro",
        Amount:   49.99,
        Customer: "alice@example.com",
    }

    if err := client.PublishEvent(ctx, "pubsub", "order-placed", event); err != nil {
        log.Fatalf("publish failed: %v", err)
    }
    log.Println("Event published")
}
```

## Publishing with Metadata

```go
// Publish with custom CloudEvent metadata
if err := client.PublishEvent(
    ctx,
    "pubsub",
    "order-placed",
    event,
    dapr.PublishEventWithContentType("application/json"),
); err != nil {
    log.Fatal(err)
}
```

## Subscribing to Topics (HTTP Service)

```go
import (
    "github.com/dapr/go-sdk/service/common"
    daprd "github.com/dapr/go-sdk/service/http"
)

func main() {
    s := daprd.NewService(":8080")

    sub := &common.Subscription{
        PubsubName: "pubsub",
        Topic:      "order-placed",
        Route:      "/order-placed",
    }

    if err := s.AddTopicEventHandler(sub, handleOrderPlaced); err != nil {
        log.Fatal(err)
    }

    if err := s.Start(); err != nil {
        log.Fatal(err)
    }
}

func handleOrderPlaced(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
    log.Printf("Topic: %s, Source: %s, ID: %s", e.Topic, e.Source, e.ID)

    var order OrderPlaced
    if err := e.Struct(&order); err != nil {
        return false, err // do not retry deserialization errors
    }

    log.Printf("Processing order %s for %s", order.OrderID, order.Customer)
    return false, nil
}
```

## Subscribing with Dead Letter Topic

```go
sub := &common.Subscription{
    PubsubName:      "pubsub",
    Topic:           "order-placed",
    Route:           "/order-placed",
    DeadLetterTopic: "order-placed-failed",
}
```

## Bulk Publishing

```go
events := []interface{}{
    OrderPlaced{OrderID: "o1"},
    OrderPlaced{OrderID: "o2"},
}
result := client.PublishEvents(ctx, "pubsub", "order-placed", events)
if result.Error != nil {
    log.Printf("Bulk publish error: %v", result.Error)
}
for _, failed := range result.FailedEvents {
    log.Printf("Failed event: %v", failed)
}
```

## Summary

The Dapr Go SDK makes event-driven microservices straightforward: publishers call `PublishEvent` with any Go struct, and subscribers register handlers with `AddTopicEventHandler`. The sidecar manages CloudEvents wrapping, broker interaction, and delivery retries - your Go code only sees deserialized structs and a simple retry boolean return value.
