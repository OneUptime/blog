# How to Use Dapr Go gRPC Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, gRPC, Service, Microservice, SDK

Description: Build a high-performance Dapr Go microservice using the gRPC service implementation for low-latency service invocation and pub/sub event handling.

---

## Overview

The Dapr Go SDK provides a gRPC service implementation in `github.com/dapr/go-sdk/service/grpc`. Compared to the HTTP service, gRPC offers lower latency and binary serialization, making it preferable for high-throughput internal microservice communication.

## Installation

```bash
go get github.com/dapr/go-sdk/service/grpc@latest
```

## Creating a gRPC Service

```go
package main

import (
    "context"
    "encoding/json"
    "log"

    "github.com/dapr/go-sdk/service/common"
    daprd "github.com/dapr/go-sdk/service/grpc"
)

func main() {
    s, err := daprd.NewService(":50002")
    if err != nil {
        log.Fatalf("failed to create grpc service: %v", err)
    }

    // Register invocation handler
    if err := s.AddServiceInvocationHandler("process", processHandler); err != nil {
        log.Fatalf("error adding handler: %v", err)
    }

    // Register pub/sub handler
    sub := &common.Subscription{
        PubsubName: "pubsub",
        Topic:      "tasks",
        Route:      "/tasks",
    }
    if err := s.AddTopicEventHandler(sub, taskHandler); err != nil {
        log.Fatalf("error adding topic handler: %v", err)
    }

    log.Println("gRPC service listening on :50002")
    if err := s.Start(); err != nil {
        log.Fatalf("error starting service: %v", err)
    }
}
```

## Service Invocation Handler

```go
func processHandler(ctx context.Context, in *common.InvocationEvent) (*common.Content, error) {
    log.Printf("Processing request: verb=%s contentType=%s", in.Verb, in.ContentType)

    result := map[string]string{"status": "processed", "id": "task-42"}
    data, _ := json.Marshal(result)

    return &common.Content{
        ContentType: "application/json",
        Data:        data,
    }, nil
}
```

## Pub/Sub Handler

```go
type Task struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

func taskHandler(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
    var task Task
    if err := json.Unmarshal(e.RawData, &task); err != nil {
        return false, err
    }
    log.Printf("Received task: %s - %s", task.ID, task.Name)
    return false, nil
}
```

## Calling a gRPC Service from Another Service

The caller does not need to know the transport protocol. Dapr handles the protocol negotiation:

```go
client, err := dapr.NewClient()
defer client.Close()

resp, err := client.InvokeMethod(ctx, "worker-service", "process", "POST")
```

## Running with gRPC Protocol

```bash
dapr run \
  --app-id worker-service \
  --app-port 50002 \
  --app-protocol grpc \
  --components-path ./components \
  -- go run main.go
```

## Comparing HTTP vs gRPC Services

| Feature | HTTP Service | gRPC Service |
|---|---|---|
| Serialization | JSON | Protobuf |
| Latency | Higher | Lower |
| Browser friendly | Yes | No |
| Streaming | Limited | Full |

## Summary

The Dapr Go gRPC service is ideal for latency-sensitive internal services. By specifying `--app-protocol grpc` when starting with the CLI, Dapr routes all service invocations and pub/sub deliveries over gRPC. The handler registration API is identical to the HTTP service, making it easy to switch protocols without changing application logic.
