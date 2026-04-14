# How to Use Dapr Service Invocation with Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, Service Invocation, Microservice, SDK, RPC

Description: Call other Dapr-enabled microservices from Go using service invocation, with built-in retries, mTLS security, and distributed tracing handled by the sidecar.

---

## Overview

Dapr service invocation lets Go microservices call each other by logical app-id rather than network address. The Dapr sidecar handles service discovery, retries, mTLS encryption, and trace propagation, leaving your application code clean and portable.

## Basic Service Invocation

```go
package main

import (
    "context"
    "fmt"
    "log"

    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    ctx := context.Background()

    // GET request to another service
    resp, err := client.InvokeMethod(ctx, "inventory-service", "products/42", "GET")
    if err != nil {
        log.Fatalf("invocation failed: %v", err)
    }
    fmt.Printf("Response: %s\n", resp)
}
```

## Invocation with Request Body

```go
import "github.com/dapr/go-sdk/client"

content := &dapr.DataContent{
    ContentType: "application/json",
    Data:        []byte(`{"productId":"prod-1","quantity":10}`),
}

resp, err := client.InvokeMethodWithContent(
    ctx,
    "inventory-service",
    "reserve",
    "POST",
    content,
)
if err != nil {
    log.Fatalf("invocation error: %v", err)
}
```

## Invocation with Custom Content

```go
resp, err := client.InvokeMethodWithCustomContent(
    ctx,
    "payment-service",
    "charge",
    "POST",
    "application/json",
    map[string]any{"amount": 99.99, "currency": "USD"},
)
```

## Registering the Handler Side

The service being invoked registers its handlers using the service package:

```go
func main() {
    s := daprd.NewService(":8080")

    if err := s.AddServiceInvocationHandler("/products/{id}", getProductHandler); err != nil {
        log.Fatal(err)
    }

    if err := s.AddServiceInvocationHandler("/reserve", reserveHandler); err != nil {
        log.Fatal(err)
    }

    log.Fatal(s.Start())
}

func getProductHandler(ctx context.Context, in *common.InvocationEvent) (*common.Content, error) {
    log.Printf("GET %s", in.QueryString)
    return &common.Content{
        ContentType: "application/json",
        Data:        []byte(`{"id":"prod-1","name":"Widget","stock":100}`),
    }, nil
}
```

## Error Handling

```go
resp, err := client.InvokeMethod(ctx, "order-service", "orders/99", "GET")
if err != nil {
    // Check if it is a Dapr status error
    if statusErr, ok := status.FromError(err); ok {
        log.Printf("gRPC status: %s - %s", statusErr.Code(), statusErr.Message())
    }
    return
}
```

## Summary

Dapr service invocation in Go uses the `client.InvokeMethod` and `client.InvokeMethodWithContent` functions to call any service by app-id. The sidecar handles retries, TLS, and tracing automatically. The handler side simply registers path-based handlers with the Dapr Go service package, with no manual HTTP routing required.
