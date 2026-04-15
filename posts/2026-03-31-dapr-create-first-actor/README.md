# How to Create Your First Dapr Actor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Go, Getting Started, Microservice

Description: A step-by-step guide to building your first Dapr actor in Go, including actor registration, state management, and invoking methods via the Dapr sidecar.

---

Dapr actors provide a turn-based, stateful programming model for distributed applications. This guide walks you through creating a simple counter actor in Go from scratch.

## Prerequisites

- Go 1.21 or later
- Dapr CLI installed and initialized (`dapr init`)
- Redis running locally (used as state store)

## Project Setup

```bash
mkdir counter-actor && cd counter-actor
go mod init counter-actor
go get github.com/dapr/go-sdk
```

## Define the Actor Interface

```go
// actor.go
package main

import "context"

type CounterActor interface {
  Increment(ctx context.Context, amount *IncrementRequest) error
  GetCount(ctx context.Context) (*CountResponse, error)
}

type IncrementRequest struct {
  Amount int `json:"amount"`
}

type CountResponse struct {
  Count int `json:"count"`
}
```

## Implement the Actor

```go
// counter_actor.go
package main

import (
  "context"
  "github.com/dapr/go-sdk/actor"
)

type CounterActorImpl struct {
  actor.ServerImplBaseCtx
}

func (a *CounterActorImpl) Type() string {
  return "Counter"
}

func (a *CounterActorImpl) Increment(ctx context.Context, req *IncrementRequest) error {
  var count int
  if err := a.GetStateManager().Get(ctx, "count", &count); err != nil {
    count = 0
  }
  count += req.Amount
  return a.GetStateManager().Set(ctx, "count", count)
}

func (a *CounterActorImpl) GetCount(ctx context.Context) (*CountResponse, error) {
  var count int
  a.GetStateManager().Get(ctx, "count", &count)
  return &CountResponse{Count: count}, nil
}
```

## Register the Actor and Start the Server

```go
// main.go
package main

import (
  "github.com/dapr/go-sdk/actor"
  daprd "github.com/dapr/go-sdk/service/http"
)

func main() {
  s := daprd.NewService(":8080")

  s.RegisterActorImplFactoryContext(func() actor.ServerContext {
    return &CounterActorImpl{}
  })

  if err := s.Start(); err != nil {
    panic(err)
  }
}
```

## Dapr Component Configuration

Create a state store component for actor state:

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: actorStateStore
    value: "true"
```

## Running the Actor Service

```bash
dapr run --app-id counter-service \
  --app-port 8080 \
  --dapr-http-port 3500 \
  --resources-path ./components \
  -- go run .
```

## Invoking the Actor

```bash
# Increment the counter
curl -X POST http://localhost:3500/v1.0/actors/Counter/my-counter/method/Increment \
  -H "Content-Type: application/json" \
  -d '{"amount": 5}'

# Read the count
curl -X POST http://localhost:3500/v1.0/actors/Counter/my-counter/method/GetCount
```

## Summary

Creating a Dapr actor involves defining an interface, implementing the actor with state manager calls, and registering it with the Dapr runtime. The sidecar handles routing, state persistence, and turn-based concurrency automatically. This simple counter example demonstrates the core pattern you can extend to build complex stateful microservice behaviors.
