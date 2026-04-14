# How to Use Dapr Go HTTP Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, HTTP, Service, Microservice, SDK

Description: Build a Dapr-enabled Go HTTP service that handles service invocations and pub/sub subscriptions using the official Dapr Go SDK service package.

---

## Overview

The Dapr Go SDK provides a built-in HTTP service implementation in `github.com/dapr/go-sdk/service/http`. It handles CloudEvents deserialization, subscription registration, and service invocation routing without requiring a third-party router.

## Installation

```bash
go get github.com/dapr/go-sdk/service/http@latest
```

## Creating the Service

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"

    "github.com/dapr/go-sdk/service/common"
    daprd "github.com/dapr/go-sdk/service/http"
)

func main() {
    s := daprd.NewService(":8080")

    // Register service invocation handlers
    if err := s.AddServiceInvocationHandler("/orders", handleGetOrder); err != nil {
        log.Fatalf("error adding handler: %v", err)
    }

    // Register pub/sub subscription
    sub := &common.Subscription{
        PubsubName: "pubsub",
        Topic:      "new-orders",
        Route:      "/new-order",
    }
    if err := s.AddTopicEventHandler(sub, handleNewOrder); err != nil {
        log.Fatalf("error adding topic handler: %v", err)
    }

    log.Println("Starting service on :8080")
    if err := s.Start(); err != nil && err != http.ErrServerClosed {
        log.Fatalf("error starting service: %v", err)
    }
}
```

## Service Invocation Handler

```go
func handleGetOrder(ctx context.Context, in *common.InvocationEvent) (*common.Content, error) {
    log.Printf("Invoked: %s %s", in.Verb, in.ContentType)

    order := map[string]any{
        "id":      "ord-1",
        "product": "Widget",
        "qty":     3,
    }
    data, err := json.Marshal(order)
    if err != nil {
        return nil, err
    }

    return &common.Content{
        ContentType: "application/json",
        Data:        data,
    }, nil
}
```

## Pub/Sub Topic Handler

```go
type Order struct {
    ID      string `json:"id"`
    Product string `json:"product"`
    Qty     int    `json:"qty"`
}

func handleNewOrder(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
    var order Order
    if err := json.Unmarshal(e.RawData, &order); err != nil {
        log.Printf("bad event data: %v", err)
        return false, err // do not retry malformed messages
    }

    log.Printf("Received order %s for %s x%d", order.ID, order.Product, order.Qty)
    return false, nil
}
```

## Graceful Shutdown

```go
import "os/signal"

func main() {
    s := daprd.NewService(":8080")
    // ... register handlers ...

    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGTERM, syscall.SIGINT)

    go func() {
        if err := s.Start(); err != nil && err != http.ErrServerClosed {
            log.Fatal(err)
        }
    }()

    <-stop
    log.Println("Shutting down...")
    s.GracefulStop()
}
```

## Running the Service

```bash
dapr run --app-id order-service --app-port 8080 --app-protocol http \
  --resources-path ./components -- go run main.go
```

## Summary

The Dapr Go HTTP service package handles all CloudEvents plumbing, subscription endpoint exposure, and invocation routing. By registering handlers with `AddServiceInvocationHandler` and `AddTopicEventHandler`, your Go service becomes a fully functional Dapr participant without any additional middleware configuration.
