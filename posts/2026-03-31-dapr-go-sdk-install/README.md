# How to Install and Configure the Dapr Go SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, SDK, Installation, Configuration, Microservice

Description: Step-by-step guide to installing the Dapr Go SDK, configuring the client connection, and writing your first Go microservice that communicates with the Dapr sidecar.

---

## Overview

The Dapr Go SDK provides idiomatic Go clients and service interfaces for all Dapr building blocks. It communicates with the local Dapr sidecar over gRPC, making it fast and suitable for high-throughput services.

## Prerequisites

- Go 1.21 or later
- Dapr CLI installed and `dapr init` completed

## Installing the SDK

```bash
go get github.com/dapr/go-sdk/client@latest
go get github.com/dapr/go-sdk/service/http@latest
```

Your `go.mod` should now reference the SDK:

```text
require github.com/dapr/go-sdk v1.11.0
```

## Creating a Basic Dapr Client

```go
package main

import (
    "context"
    "fmt"
    "log"

    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    ctx := context.Background()

    client, err := dapr.NewClient()
    if err != nil {
        log.Fatalf("failed to create dapr client: %v", err)
    }
    defer client.Close()

    // Save a value to the state store
    if err := client.SaveState(ctx, "statestore", "greeting", []byte("hello"), nil); err != nil {
        log.Fatalf("failed to save state: %v", err)
    }

    // Read it back
    item, err := client.GetState(ctx, "statestore", "greeting", nil)
    if err != nil {
        log.Fatalf("failed to get state: %v", err)
    }
    fmt.Printf("Value: %s\n", item.Value)
}
```

## Configuring the Client Endpoint

By default the client connects to the address in the `DAPR_GRPC_PORT` environment variable. Override it explicitly if needed:

```go
client, err := dapr.NewClientWithPort("50001")
// or with a full address
client, err = dapr.NewClientWithAddress("localhost:50001")
```

## Setting Up the HTTP Service

Create a Dapr HTTP service to receive subscriptions and invocations:

```go
package main

import (
    "context"
    "log"
    "net/http"

    "github.com/dapr/go-sdk/service/common"
    daprd "github.com/dapr/go-sdk/service/http"
)

func main() {
    s := daprd.NewService(":8080")

    if err := s.AddServiceInvocationHandler("/hello", helloHandler); err != nil {
        log.Fatalf("error adding invocation handler: %v", err)
    }

    if err := s.Start(); err != nil && err != http.ErrServerClosed {
        log.Fatalf("error starting service: %v", err)
    }
}

func helloHandler(ctx context.Context, in *common.InvocationEvent) (*common.Content, error) {
    return &common.Content{Data: []byte("Hello from Go!")}, nil
}
```

## Running with the Dapr CLI

```bash
dapr run --app-id go-service --app-port 8080 --app-protocol http \
  -- go run main.go
```

## Summary

Installing the Dapr Go SDK requires two `go get` commands and no additional build tools. The `dapr.NewClient()` function auto-discovers the sidecar via environment variables, and the HTTP or gRPC service constructors handle all CloudEvents routing. This minimal setup gives your Go service access to every Dapr building block.
