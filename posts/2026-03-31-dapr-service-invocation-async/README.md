# How to Use Dapr Service Invocation for Async Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Invocation, Async, Microservice, Event-Driven

Description: Implement async service invocation patterns with Dapr using fire-and-forget, pub/sub-backed calls, and response callbacks for non-blocking microservices.

---

## Overview

By default, Dapr service invocation is synchronous: the caller blocks until the target returns a response. For long-running operations, high-throughput pipelines, or decoupled systems you need async patterns. This guide covers three approaches: fire-and-forget HTTP, pub/sub-backed async invocation, and response callbacks via a separate topic.

## Async Pattern Comparison

```mermaid
graph TD
    A["Sync Invocation\n(caller blocks)"]
    B["Fire-and-Forget\n(202 Accepted, no result)"]
    C["Pub/Sub-Backed\n(fully decoupled)"]
    D["Request-Reply via Pub/Sub\n(async with callback)"]

    A -->|"latency sensitive\nsmall payloads"| Use1["Use for: internal APIs"]
    B -->|"kick off background work"| Use2["Use for: notifications, emails"]
    C -->|"full decoupling, replay"| Use3["Use for: event pipelines"]
    D -->|"need result, tolerate latency"| Use4["Use for: order processing"]
```

## Pattern 1: Fire-and-Forget via HTTP Dapr Metadata

Accept the invocation immediately and process in the background using a goroutine or background thread.

### Target Service (Go)

```go
// server.go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

type Order struct {
    ID    string  `json:"id"`
    Total float64 `json:"total"`
}

func processOrderAsync(order Order) {
    // Simulate long-running processing
    fmt.Printf("Processing order %s in background...\n", order.ID)
}

func handleCreateOrder(w http.ResponseWriter, r *http.Request) {
    var order Order
    json.NewDecoder(r.Body).Decode(&order)

    // Return 202 immediately
    w.WriteHeader(http.StatusAccepted)
    w.Write([]byte(`{"status":"accepted"}`))

    // Process asynchronously
    go processOrderAsync(order)
}

func main() {
    http.HandleFunc("/createOrder", handleCreateOrder)
    http.ListenAndServe(":8080", nil)
}
```

### Caller

```go
// caller.go
resp, err := client.InvokeMethodWithContent(ctx, "order-service", "createOrder", "post", content)
// resp may be 202 Accepted - we don't wait for processing to complete
```

## Pattern 2: Async via Pub/Sub (Fully Decoupled)

The caller publishes an event instead of invoking a service directly. The processor subscribes and handles it independently.

### Caller Publishes Instead of Invoking

```go
// caller publishes
order := map[string]interface{}{"id": "order-1", "total": 99.95}
data, _ := json.Marshal(order)

err = client.PublishEvent(ctx, "pubsub", "orders.create", data)
```

### Processor Subscribes

```go
// processor/server.go
package main

import (
    "context"
    "encoding/json"
    "fmt"

    "github.com/dapr/go-sdk/service/common"
    daprd "github.com/dapr/go-sdk/service/grpc"
)

func handleOrder(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var order map[string]interface{}
    json.Unmarshal(e.RawData, &order)
    fmt.Printf("Processing order: %v\n", order)
    return false, nil
}

func main() {
    s, _ := daprd.NewService(":6001")
    s.AddTopicEventHandler(&common.Subscription{
        PubsubName: "pubsub",
        Topic:      "orders.create",
        Route:      "/orders/create",
    }, handleOrder)
    s.Start()
}
```

## Pattern 3: Request-Reply via Pub/Sub

The caller publishes a request event and subscribes to a reply topic. This achieves async invocation with a result.

```mermaid
sequenceDiagram
    participant Caller as Caller App
    participant PubSub as Dapr Pub/Sub
    participant Processor as Order Processor

    Note over Caller,PubSub: At startup
    Caller->>PubSub: subscribe("orders.reply")
    Processor->>PubSub: subscribe("orders.request")

    Note over Caller,Processor: At request time
    Caller->>PubSub: publish("orders.request", {correlationId, payload})
    PubSub->>Processor: deliver event
    Processor->>PubSub: publish("orders.reply", {correlationId, result})
    PubSub->>Caller: deliver result
    Caller->>Caller: match by correlationId
```

### Caller Sends Request

Dapr subscriptions are registered at startup and cannot be added dynamically at runtime. Subscribe to a single reply topic and route responses by correlation ID.

```go
// Register a single reply handler at startup (before s.Start())
var (
    pendingRequests = make(map[string]chan map[string]interface{})
    mu              sync.Mutex
)

s.AddTopicEventHandler(&common.Subscription{
    PubsubName: "pubsub",
    Topic:      "orders.reply",
    Route:      "/orders/reply",
}, func(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var reply map[string]interface{}
    json.Unmarshal(e.RawData, &reply)

    corrID := reply["correlationId"].(string)
    mu.Lock()
    ch, ok := pendingRequests[corrID]
    mu.Unlock()
    if ok {
        ch <- reply
    }
    return false, nil
})

// To send a request and wait for a reply:
correlationID := uuid.New().String()
replyCh := make(chan map[string]interface{}, 1)

mu.Lock()
pendingRequests[correlationID] = replyCh
mu.Unlock()

request := map[string]interface{}{
    "correlationId": correlationID,
    "payload":       order,
}
data, _ := json.Marshal(request)

client.PublishEvent(ctx, "pubsub", "orders.request", data)

// Wait for reply
reply := <-replyCh
fmt.Printf("Got reply for %s: %v\n", correlationID, reply)

mu.Lock()
delete(pendingRequests, correlationID)
mu.Unlock()
```

### Processor Replies

```go
func handleOrderRequest(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var request map[string]interface{}
    json.Unmarshal(e.RawData, &request)

    correlationID := request["correlationId"].(string)

    // Process...
    result := map[string]interface{}{
        "correlationId": correlationID,
        "status":        "completed",
        "orderId":       "order-1",
    }
    data, _ := json.Marshal(result)

    // Publish reply to the shared reply topic
    daprClient.PublishEvent(ctx, "pubsub", "orders.reply", data)
    return false, nil
}
```

## Pattern 4: Async via Dapr Workflow

For orchestrated multi-step async flows, use Dapr Workflow:

```go
// Define a workflow that orchestrates async activities
func OrderWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var input OrderPayload
    ctx.GetInput(&input)

    // Run activities asynchronously
    var validated bool
    if err := ctx.CallActivity(ValidateOrder, workflow.WithActivityInput(input)).Await(&validated); err != nil {
        return nil, err
    }

    var charged bool
    if err := ctx.CallActivity(ChargePayment, workflow.WithActivityInput(input)).Await(&charged); err != nil {
        return nil, err
    }

    return map[string]bool{"success": true}, nil
}
```

## Choosing the Right Pattern

| Requirement | Recommended Pattern |
|---|---|
| Need result immediately | Synchronous invocation |
| Background processing, no result needed | Fire-and-forget (202) |
| Full decoupling and replay | Pub/Sub async |
| Need result but can wait | Request-Reply via Pub/Sub |
| Multi-step with compensation | Dapr Workflow |

## Summary

Dapr service invocation supports async patterns through three main approaches: returning 202 and processing in a background goroutine, replacing direct invocation with pub/sub publish/subscribe for full decoupling, and implementing request-reply correlation over pub/sub when a result is required. For complex orchestration with compensation and state, Dapr Workflow is the recommended approach.
