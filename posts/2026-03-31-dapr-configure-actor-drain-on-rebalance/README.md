# How to Configure Actor Drain on Rebalance in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Drain, Rebalance, Kubernetes

Description: Configure Dapr actor draining on pod rebalance to ensure active actor calls complete gracefully before actors are migrated during deployments or scaling.

---

## Overview

When a Dapr-enabled pod shuts down, actors hosted on that pod need to finish their current operation before being migrated to another pod. Dapr's `drainOngoingCallTimeout` setting controls how long the runtime waits for in-flight actor calls to complete.

## Actor Configuration for Graceful Drain

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: actorconfig
  namespace: default
spec:
  features:
  - name: ActorStateTTL
    enabled: true
  actor:
    actorIdleTimeout: "1h"
    actorScanInterval: "30s"
    drainOngoingCallTimeout: "60s"
    drainRebalancedActors: true
    reentrancy:
      enabled: false
```

## Applying the Configuration to Your App

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-actor-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-actor-service"
        dapr.io/app-port: "3000"
        dapr.io/config: "actorconfig"
```

## Kubernetes Graceful Termination

Set `terminationGracePeriodSeconds` to match or exceed your drain timeout:

```yaml
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 90  # > drainOngoingCallTimeout (60s)
      containers:
      - name: order-actor-service
        image: order-actor:latest
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]
```

The `preStop` hook adds a brief delay before Kubernetes sends SIGTERM, allowing time for the pod's endpoint removal to propagate through kube-proxy so that new requests are no longer routed to this pod.

## Implementing Actor State Persistence on Deactivation

```go
package main

import (
    "fmt"
    "github.com/dapr/go-sdk/actor"
)

type OrderActor struct {
    actor.ServerImplBaseCtx
    orderID string
}

func (a *OrderActor) Type() string {
    return "OrderActor"
}

// SaveState is called when the actor is deactivated or migrated.
// Override it to persist any critical in-memory state before deactivation.
func (a *OrderActor) SaveState() error {
    fmt.Printf("Actor %s saving state before deactivation\n", a.orderID)
    // Persist any critical in-memory state via the state manager here
    return a.ServerImplBaseCtx.SaveState()
}
```

## Testing Drain Behavior

```bash
# Trigger a rolling update
kubectl rollout restart deployment/order-actor-service

# Watch pods for graceful termination
kubectl get pods -w | grep order-actor

# Check Dapr logs for drain activity
kubectl logs -f deploy/order-actor-service -c daprd | grep -i "drain\|deactivat"
```

## Monitoring Actor Migration

```bash
# Prometheus query for actor rebalancing events
dapr_runtime_actor_rebalanced_total

# Actor deactivation count
dapr_runtime_actor_deactivated_total
```

## Tuning Drain Timeout

| Actor Call Duration | Recommended drainOngoingCallTimeout |
|--------------------|--------------------------------------|
| < 1 second | 10s |
| 1-10 seconds | 30s |
| 10-60 seconds | 90s |
| > 60 seconds | 120s + refactor to activities |

For actor operations exceeding 60 seconds, consider breaking them into workflow activities instead.

## Summary

Configure `drainOngoingCallTimeout` and `drainRebalancedActors: true` in the Dapr actor configuration to ensure graceful actor migration during deployments. Set Kubernetes `terminationGracePeriodSeconds` to exceed the drain timeout, add a `preStop` hook for smooth request draining, and override `SaveState` to persist any in-memory state before migration.
