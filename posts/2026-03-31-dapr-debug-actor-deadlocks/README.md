# How to Debug Actor Deadlocks in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Deadlock, Debugging, Reentrancy

Description: Debug and resolve actor deadlocks in Dapr caused by turn-based concurrency and circular actor calls, using reentrancy, call chain analysis, and timeout strategies.

---

## Overview

Dapr actors use turn-based concurrency - only one method executes at a time per actor. Deadlocks occur when Actor A calls Actor B while holding its turn, and Actor B tries to call back to Actor A. Both actors wait indefinitely for the other to release.

## Common Deadlock Scenarios

**Scenario 1: Circular call chain**

```text
Actor A (turn locked) -> calls -> Actor B (waiting for turn) -> calls back -> Actor A (locked)
```

**Scenario 2: Self-invocation without reentrancy**

```text
Actor A method1 -> calls Actor A method2 (same actor, different method - blocked)
```

## Enabling Reentrancy to Resolve Deadlocks

Reentrancy allows an actor to accept calls while already executing, breaking circular wait conditions:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: actorconfig
spec:
  actor:
    reentrancy:
      enabled: true
      maxStackDepth: 32
```

## Detecting Deadlocks via Timeout

Configure short timeouts to surface deadlocks as errors rather than hanging:

```go
package main

import (
    "context"
    "time"
    "net/http"
    "fmt"
)

func callActorWithTimeout(actorType, actorID, method string, timeout time.Duration) error {
    ctx, cancel := context.WithTimeout(context.Background(), timeout)
    defer cancel()

    url := fmt.Sprintf(
        "http://localhost:3500/v1.0/actors/%s/%s/method/%s",
        actorType, actorID, method,
    )

    req, _ := http.NewRequestWithContext(ctx, "PUT", url, nil)
    client := &http.Client{}

    resp, err := client.Do(req)
    if err != nil {
        if ctx.Err() == context.DeadlineExceeded {
            return fmt.Errorf("actor call timed out - possible deadlock: %w", err)
        }
        return err
    }
    defer resp.Body.Close()
    return nil
}
```

## Logging Call Chains

Add call chain tracking to identify deadlock participants:

```go
type ActorCallContext struct {
    CallChain []string `json:"callChain"`
    TraceID   string   `json:"traceId"`
}

func (a *OrderActor) ProcessOrder(ctx context.Context, input ProcessInput) error {
    // Log entry with call chain
    fmt.Printf("Actor %s entering ProcessOrder, trace: %s, chain: %v\n",
        a.ID(), input.TraceID, input.CallChain)

    // Add self to call chain before calling another actor
    input.CallChain = append(input.CallChain, fmt.Sprintf("OrderActor/%s", a.ID()))

    // Detect potential circular calls
    for _, caller := range input.CallChain {
        if caller == fmt.Sprintf("InventoryActor/%s", input.InventoryID) {
            return fmt.Errorf("circular call detected in chain: %v", input.CallChain)
        }
    }

    return a.callInventoryActor(ctx, input)
}
```

## Restructuring to Avoid Deadlocks

The safest fix is eliminating circular dependencies using events instead of direct calls:

```go
// Instead of Actor A calling Actor B which calls back to A...
// Use pub/sub to decouple:

func (a *OrderActor) ProcessPayment(ctx context.Context, input PaymentInput) error {
    // Publish event instead of calling InventoryActor directly
    // InventoryActor subscribes and handles independently
    return a.publishEvent(ctx, "payment-completed", map[string]any{
        "orderId":   a.ID(),
        "paymentId": input.PaymentID,
    })
}
```

## Analyzing Dapr Logs for Stuck Actors

```bash
# Find actors with long-running requests
kubectl logs deploy/my-actor-service -c daprd | grep -i "actor\|timeout" | tail -100

# Look for repeated placement lookups (actor waiting)
kubectl logs deploy/my-actor-service -c daprd | grep "placement lookup" | awk '{print $NF}' | sort | uniq -c | sort -rn
```

## Summary

Dapr actor deadlocks stem from circular call chains blocked by turn-based concurrency. Resolve them by enabling reentrancy for known-safe call patterns, restructuring circular dependencies to use pub/sub decoupling, or breaking chains with async patterns. Add explicit timeout contexts to actor calls to fail fast on deadlocks, and log call chain metadata to quickly identify participants in a deadlock during debugging.
