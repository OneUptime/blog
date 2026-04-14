# How to Implement Request Aggregation with Dapr Actors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Request Aggregation, Pattern, Microservice

Description: Learn how to implement request aggregation using Dapr Actors to collect and batch multiple requests before processing them together for efficiency.

---

## Overview

Request aggregation collects multiple individual requests and processes them as a batch. This reduces per-request overhead, decreases backend calls, and improves throughput. Dapr Actors are ideal for aggregation because each actor maintains isolated state and can use timers to flush accumulated requests.

## Aggregator Actor Design

The aggregator actor accumulates requests within a time window, then processes them as a batch:

```go
package main

import (
    "context"
    "time"
    "github.com/dapr/go-sdk/actor"
)

type MetricEvent struct {
    ServiceID string  `json:"serviceId"`
    MetricName string `json:"metricName"`
    Value     float64 `json:"value"`
    Timestamp int64   `json:"timestamp"`
}

type MetricAggregatorState struct {
    Events  []MetricEvent `json:"events"`
    LastFlush time.Time   `json:"lastFlush"`
}

type MetricAggregatorActor struct {
    actor.ServerImplBase
    stateManager actor.StateManager
}

func (a *MetricAggregatorActor) Type() string {
    return "MetricAggregator"
}

func (a *MetricAggregatorActor) AddMetric(ctx context.Context, event *MetricEvent) error {
    var state MetricAggregatorState
    a.GetStateManager().Get(ctx, "buffer", &state)

    state.Events = append(state.Events, *event)

    // Flush if buffer is large enough
    if len(state.Events) >= 100 {
        if err := a.flush(ctx, &state); err != nil {
            return err
        }
        state.Events = nil
    }

    return a.GetStateManager().Set(ctx, "buffer", state)
}

func (a *MetricAggregatorActor) flush(ctx context.Context, state *MetricAggregatorState) error {
    if len(state.Events) == 0 {
        return nil
    }
    // Send aggregated batch to time-series service
    return sendBatchToTSDB(ctx, state.Events)
}
```

## Setting Up Timer-Based Flush

```go
func (a *MetricAggregatorActor) OnActivate() error {
    // Register timer to flush every 5 seconds
    return a.RegisterActorTimer(
        "flushTimer",
        "FlushBuffer",
        nil,
        5*time.Second,
        5*time.Second,
    )
}

func (a *MetricAggregatorActor) FlushBuffer(ctx context.Context, data []byte) error {
    var state MetricAggregatorState
    a.GetStateManager().Get(ctx, "buffer", &state)

    if err := a.flush(ctx, &state); err != nil {
        return err
    }

    state.Events = nil
    state.LastFlush = time.Now()
    return a.GetStateManager().Set(ctx, "buffer", state)
}
```

## Client: Sending Events to the Aggregator

```go
package main

import (
    "context"
    "encoding/json"
    "time"
    dapr "github.com/dapr/go-sdk/client"
)

func sendMetric(client dapr.Client, serviceID, metricName string, value float64) error {
    event := MetricEvent{
        ServiceID:  serviceID,
        MetricName: metricName,
        Value:      value,
        Timestamp:  time.Now().Unix(),
    }

    data, err := json.Marshal(event)
    if err != nil {
        return err
    }

    // Route to the same actor for the same service (actor ID = serviceID)
    _, err = client.InvokeActor(
        context.Background(),
        &dapr.InvokeActorRequest{
            ActorType: "MetricAggregator",
            ActorID:   serviceID,     // Same service routes to same actor
            Method:    "AddMetric",
            Data:      data,
        },
    )
    return err
}
```

## Aggregating HTTP Requests

For aggregating HTTP calls rather than actor invocations:

```go
type RequestBuffer struct {
    mu       sync.Mutex
    requests []Request
    timer    *time.Timer
    flushFn  func([]Request)
}

func (rb *RequestBuffer) Add(req Request) {
    rb.mu.Lock()
    defer rb.mu.Unlock()

    rb.requests = append(rb.requests, req)

    // Reset the debounce timer
    if rb.timer != nil {
        rb.timer.Stop()
    }
    rb.timer = time.AfterFunc(100*time.Millisecond, func() {
        rb.mu.Lock()
        batch := rb.requests
        rb.requests = nil
        rb.mu.Unlock()
        rb.flushFn(batch)
    })

    // Immediate flush at 50 requests
    if len(rb.requests) >= 50 {
        rb.timer.Stop()
        batch := rb.requests
        rb.requests = nil
        go rb.flushFn(batch)
    }
}
```

## Registering the Actor

```go
func main() {
    s := daprd.NewService(":8080")

    s.RegisterActor(&MetricAggregatorActor{})

    if err := s.Start(); err != nil {
        log.Fatal(err)
    }
}
```

## Summary

Dapr Actors implement request aggregation by maintaining a stateful buffer per aggregation key. Timers trigger periodic flushes while size thresholds trigger immediate processing. This pattern significantly reduces the number of downstream service calls by batching multiple events into single bulk operations, improving throughput and reducing backend load.
