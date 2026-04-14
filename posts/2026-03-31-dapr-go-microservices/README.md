# How to Build Microservices with Dapr and Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, Microservice, Architecture, Distributed System, Cloud Native

Description: Build a complete event-driven microservices system in Go using Dapr for service invocation, state management, and pub/sub with a practical order processing example.

---

## Overview

This guide walks through building a small but realistic microservices system in Go using Dapr. The system processes customer orders through three services: an API gateway, an order service, and an inventory service. Dapr handles all inter-service communication.

## System Architecture

```text
Client --> [API Gateway :8080] --> (Dapr) --> [Order Service :8081]
                                      |
                                  pub/sub
                                      |
                               [Inventory Service :8082]
```

## API Gateway Service

```go
package main

import (
    "context"
    "encoding/json"
    "log"

    dapr "github.com/dapr/go-sdk/client"
    "github.com/dapr/go-sdk/service/common"
    daprd "github.com/dapr/go-sdk/service/http"
)

type Order struct {
    ID        string  `json:"id"`
    ProductID string  `json:"productId"`
    Quantity  int     `json:"quantity"`
    Amount    float64 `json:"amount"`
}

var daprClient dapr.Client

func main() {
    var err error
    daprClient, err = dapr.NewClient()
    if err != nil {
        log.Fatal(err)
    }
    defer daprClient.Close()

    s := daprd.NewService(":8080")
    s.AddServiceInvocationHandler("/orders", createOrder)
    s.Start()
}

func createOrder(ctx context.Context, in *common.InvocationEvent) (*common.Content, error) {
    var order Order
    json.Unmarshal(in.Data, &order)

    // Forward to order service
    resp, err := daprClient.InvokeMethodWithContent(ctx, "order-service", "orders", "POST",
        &dapr.DataContent{ContentType: "application/json", Data: in.Data})
    if err != nil {
        return nil, err
    }
    return &common.Content{ContentType: "application/json", Data: resp}, nil
}
```

## Order Service

```go
func processOrder(ctx context.Context, in *common.InvocationEvent) (*common.Content, error) {
    var order Order
    json.Unmarshal(in.Data, &order)

    // Save to state store
    daprClient.SaveState(ctx, "statestore", "order:"+order.ID, in.Data, nil)

    // Publish to inventory service
    daprClient.PublishEvent(ctx, "pubsub", "order-created", order)

    result, _ := json.Marshal(map[string]string{"status": "accepted", "id": order.ID})
    return &common.Content{ContentType: "application/json", Data: result}, nil
}
```

## Inventory Service

```go
func handleOrderCreated(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
    var order Order
    if err := e.DataAs(&order); err != nil {
        return false, err
    }

    log.Printf("Reserving %d units of product %s for order %s",
        order.Quantity, order.ProductID, order.ID)

    // Update inventory in state store
    key := "inventory:" + order.ProductID
    item, _ := daprClient.GetState(ctx, "statestore", key, nil)

    var stock int
    json.Unmarshal(item.Value, &stock)
    stock -= order.Quantity

    data, _ := json.Marshal(stock)
    daprClient.SaveState(ctx, "statestore", key, data, nil)

    log.Printf("Inventory updated: %s = %d", order.ProductID, stock)
    return false, nil
}
```

## Multi-App Run Configuration

```yaml
# dapr.yaml
version: 1
apps:
  - appID: api-gateway
    appDirPath: ./gateway
    appPort: 8080
    command: ["go", "run", "main.go"]

  - appID: order-service
    appDirPath: ./order
    appPort: 8081
    command: ["go", "run", "main.go"]

  - appID: inventory-service
    appDirPath: ./inventory
    appPort: 8082
    command: ["go", "run", "main.go"]
```

```bash
dapr run -f dapr.yaml
```

## Summary

A Dapr-based Go microservices system separates transport concerns from business logic. Each service uses the Dapr Go SDK for service invocation and pub/sub, while the Dapr sidecar handles service discovery, mTLS, retries, and distributed tracing. The multi-app run file provides a one-command startup experience for the entire system during local development.
