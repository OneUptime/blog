# How to Handle Actor Activation Storms in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Activation, Performance, Scaling

Description: Prevent and handle actor activation storms in Dapr caused by mass actor reactivation after deployments, using lazy loading, warm-up strategies, and backoff.

---

## Overview

An actor activation storm occurs when thousands of actors need to activate simultaneously - typically after a deployment, scaling event, or Redis restart causes all actors to deactivate. This floods the state store and placement service with concurrent activation requests.

## What Causes Activation Storms

- Rolling deployment restarting all pods simultaneously
- State store restart clearing actor assignments
- Rapid scale-out from 0 to N replicas
- Pod crash-loop recovery with many active actors

## Configuring Scan Intervals to Spread Activation

Spread idle timeout scanning to avoid synchronized deactivations. Actor runtime settings are configured through your application via the `/dapr/config` endpoint, not the Dapr Configuration CRD:

```go
import "net/http"
import "encoding/json"

func daprConfigHandler(w http.ResponseWriter, r *http.Request) {
    config := map[string]interface{}{
        "entities":                []string{"OrderActor"},
        "actorIdleTimeout":       "1h",
        "actorScanInterval":      "30s",   // Stagger the scan window
        "drainOngoingCallTimeout": "60s",
        "drainRebalancedActors":  true,
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(config)
}

// Register in your HTTP server:
// http.HandleFunc("/dapr/config", daprConfigHandler)
```

A 30-second scan interval means deactivations are spread across a 30-second window, reducing the thundering herd.

## Warm-Up Strategy: Gradual Actor Activation

Instead of activating all actors immediately on startup, use a warm-up worker that activates actors in batches:

```go
package main

import (
    "time"
    "net/http"
    "fmt"
)

func warmUpActors(actorIDs []string, batchSize int, delay time.Duration) {
    for i := 0; i < len(actorIDs); i += batchSize {
        end := i + batchSize
        if end > len(actorIDs) {
            end = len(actorIDs)
        }
        batch := actorIDs[i:end]

        for _, id := range batch {
            go activateActor(id)
        }

        // Wait between batches to avoid overloading state store
        time.Sleep(delay)
    }
}

func activateActor(actorID string) {
    url := fmt.Sprintf(
        "http://localhost:3500/v1.0/actors/OrderActor/%s/method/ping",
        actorID,
    )
    resp, err := http.Post(url, "application/json", nil)
    if err != nil {
        fmt.Printf("Failed to activate actor %s: %v\n", actorID, err)
        return
    }
    defer resp.Body.Close()
}

func main() {
    // Load actor IDs from database
    actorIDs := loadActiveActorIDs()

    // Activate in batches of 50, 100ms apart
    warmUpActors(actorIDs, 50, 100*time.Millisecond)
}
```

## Kubernetes Deployment Strategy to Prevent Storms

Use a slow rolling update to limit simultaneous pod replacements:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: actor-service
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1     # Only 1 pod down at a time
      maxSurge: 1           # Only 1 extra pod at a time
  template:
    spec:
      terminationGracePeriodSeconds: 120
```

## Rate Limiting Actor Activation

Since actor activation in Dapr is triggered on the first method invocation, add a semaphore in your actor method handler to cap concurrent activations:

```go
import (
    "context"
    "fmt"
    "time"

    "golang.org/x/sync/semaphore"
)

var activationSem = semaphore.NewWeighted(20) // Max 20 concurrent activations

func (a *OrderActor) Ping(ctx context.Context) (string, error) {
    // Acquire semaphore with timeout
    timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()

    if err := activationSem.Acquire(timeoutCtx, 1); err != nil {
        return "", fmt.Errorf("activation throttled: %w", err)
    }
    defer activationSem.Release(1)

    // Load state from store
    return "ok", a.loadState(ctx)
}
```

## Monitoring Activation Rate

```bash
# Prometheus query for activation rate
rate(dapr_runtime_actor_activated_total[1m])

# Alert if activation rate spikes
- alert: ActorActivationStorm
  expr: rate(dapr_runtime_actor_activated_total[1m]) > 100
  for: 2m
  labels:
    severity: warning
```

## Summary

Actor activation storms occur when many actors need to activate simultaneously after deployments or state store restarts. Prevent them by using slow rolling updates (`maxUnavailable: 1`), spreading scan intervals to stagger deactivations, and implementing batch warm-up workers for controlled startup. Add in-process semaphores to cap concurrent activations during storm recovery, and alert on unusual activation spikes.
