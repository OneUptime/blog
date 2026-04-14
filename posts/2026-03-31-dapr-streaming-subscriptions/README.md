# How to Use Streaming Subscriptions in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Streaming, Subscription, Microservice

Description: Learn how to use Dapr streaming subscriptions to receive pub/sub messages via a persistent gRPC stream rather than HTTP push callbacks.

---

## What Are Streaming Subscriptions?

Traditional Dapr subscriptions use HTTP POST callbacks - the Dapr sidecar pushes messages to your app's endpoint. Streaming subscriptions flip this model: your app opens a persistent gRPC stream to the Dapr sidecar and pulls messages over that stream. This approach reduces latency, avoids cold-start issues, and works well in environments where inbound HTTP is restricted.

Streaming subscriptions were introduced as an alpha feature in Dapr 1.14 and are available via the gRPC API.

## Prerequisites

You need the Dapr Go SDK (or another SDK that supports streaming subscriptions):

```bash
go mod init streaming-demo
go get github.com/dapr/go-sdk@latest
```

## Opening a Streaming Subscription in Go

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
        log.Fatal(err)
    }
    defer client.Close()

    sub, err := client.Subscribe(ctx, dapr.SubscriptionOptions{
        PubsubName: "pubsub",
        Topic:      "orders",
    })
    if err != nil {
        log.Fatal(err)
    }
    defer sub.Close()

    fmt.Println("Streaming subscription open, waiting for messages...")

    for {
        msg, err := sub.Receive()
        if err != nil {
            log.Printf("Error receiving message: %v", err)
            break
        }

        fmt.Printf("Received: %s\n", string(msg.RawData))

        if err := msg.Success(); err != nil {
            log.Printf("Failed to ack message: %v", err)
        }
    }
}
```

## Handling Messages with Retry Logic

For production use, wrap message processing in error handling and use `msg.Retry()` for transient failures:

```go
for {
    msg, err := sub.Receive()
    if err != nil {
        log.Printf("Stream error: %v", err)
        return
    }

    if err := processMessage(msg.RawData); err != nil {
        log.Printf("Processing failed, retrying: %v", err)
        // Return the message for retry
        if retryErr := msg.Retry(); retryErr != nil {
            log.Printf("Retry signal failed: %v", retryErr)
        }
        continue
    }

    if err := msg.Success(); err != nil {
        log.Printf("Ack failed: %v", err)
    }
}
```

## Running with Dapr

Start your streaming subscriber with the Dapr CLI:

```bash
dapr run \
  --app-id streaming-subscriber \
  --dapr-grpc-port 50001 \
  -- go run main.go
```

Note that streaming subscriptions communicate over gRPC, so `--app-port` is not required - your app connects out to the sidecar rather than receiving inbound HTTP.

## Publishing Messages to Test the Stream

```bash
curl -s -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ord-999", "customer": "Bob"}'
```

The message should appear immediately in your streaming subscriber's output.

## Comparing Streaming vs HTTP Push

| Feature | HTTP Push | Streaming |
|---|---|---|
| Direction | Sidecar calls app | App calls sidecar |
| Transport | HTTP POST | gRPC stream |
| Cold start | Requires running HTTP server | Works from any goroutine |
| Backpressure | Limited | Natural via stream flow control |
| App port required | Yes | No |

## Summary

Dapr streaming subscriptions allow your application to pull messages over a persistent gRPC connection rather than receiving HTTP push callbacks. This model is well-suited for batch processors, background workers, and services running in environments without inbound HTTP access, and provides natural backpressure through gRPC stream flow control.
