# How to Use Dapr Actors with Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, Actor, Microservice, Distributed System, Concurrency

Description: Implement the virtual actor pattern in Go using the Dapr actor building block for stateful, single-threaded distributed objects with timers and reminders.

---

## Overview

Dapr's actor building block implements the virtual actor pattern: actors are single-threaded objects with isolated state that are automatically activated on first call and garbage-collected when idle. The Dapr Go SDK provides an interface for defining actor types and registering them with the runtime.

## Defining an Actor Interface

```go
package actors

import "context"

type CounterActor interface {
    Increment(ctx context.Context) error
    GetCount(ctx context.Context) (int, error)
    Reset(ctx context.Context) error
}
```

## Implementing the Actor

```go
package actors

import (
    "context"

    "github.com/dapr/go-sdk/actor"
)

type CounterActorImpl struct {
    actor.ServerImplBaseCtx
}

func (a *CounterActorImpl) Type() string { return "CounterActor" }

func (a *CounterActorImpl) Increment(ctx context.Context) error {
    var count int
    _ = a.GetStateManager().Get(ctx, "count", &count)
    return a.GetStateManager().Set(ctx, "count", count+1)
}

func (a *CounterActorImpl) GetCount(ctx context.Context) (int, error) {
    var count int
    err := a.GetStateManager().Get(ctx, "count", &count)
    if err != nil {
        return 0, nil
    }
    return count, nil
}

func (a *CounterActorImpl) Reset(ctx context.Context) error {
    return a.GetStateManager().Set(ctx, "count", 0)
}
```

## Registering the Actor with the Service

```go
package main

import (
    "log"

    "github.com/dapr/go-sdk/actor"
    daprd "github.com/dapr/go-sdk/service/http"
    "myapp/actors"
)

func main() {
    s := daprd.NewService(":8080")

    s.RegisterActorImplFactoryContext(func() actor.ServerContext {
        return &actors.CounterActorImpl{}
    })

    if err := s.Start(); err != nil {
        log.Fatal(err)
    }
}
```

## Calling an Actor from a Client

Define a client stub struct with function fields that match the actor methods, then use `ImplActorClientStub` to wire them up:

```go
// Define the client stub
type CounterClientStub struct {
    Increment func(ctx context.Context) error
    GetCount  func(ctx context.Context) (int, error)
    Reset     func(ctx context.Context) error
}

func (c *CounterClientStub) Type() string { return "CounterActor" }
func (c *CounterClientStub) ID() string   { return "counter-1" }
```

Then invoke actor methods through the stub:

```go
daprClient, err := dapr.NewClient()
if err != nil {
    log.Fatal(err)
}

stub := new(CounterClientStub)
daprClient.ImplActorClientStub(stub)

// Increment
if err := stub.Increment(ctx); err != nil {
    log.Fatal(err)
}

// Get count
count, err := stub.GetCount(ctx)
if err != nil {
    log.Fatal(err)
}
log.Printf("Count: %d", count)
```

## Adding a Reminder

Register a reminder using the Dapr client:

```go
daprClient, err := dapr.NewClient()
if err != nil {
    log.Fatal(err)
}

err = daprClient.RegisterActorReminder(ctx, &dapr.RegisterActorReminderRequest{
    ActorType: "CounterActor",
    ActorID:   "counter-1",
    Name:      "daily-reset",
    DueTime:   "24h",
    Period:    "24h",
})
if err != nil {
    log.Fatal(err)
}
```

Then handle the reminder callback in the actor by implementing the `ReminderCallee` interface:

```go
func (a *CounterActorImpl) ReminderCall(reminderName string, state []byte,
    dueTime string, period string) {
    if reminderName == "daily-reset" {
        a.Reset(context.Background())
    }
}
```

## Summary

The Dapr Go actor implementation requires three steps: defining an interface, implementing `ServerImplBase`, and registering with the service. The Dapr runtime handles placement, state persistence, and turn-based concurrency automatically. Reminders and timers make it easy to build self-managing stateful actors without external schedulers.
