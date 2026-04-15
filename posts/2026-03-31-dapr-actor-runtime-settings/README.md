# How to Configure Actor Runtime Settings in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Runtime, Configuration, Kubernetes

Description: Configure Dapr actor runtime settings including idle timeout, scan interval, drain timeout, and reentrancy options to tune actor behavior in production.

---

Dapr actor runtime settings control how actors are hosted, deactivated, and balanced across instances. Properly tuning these settings is critical for performance and resource efficiency in production deployments.

## Configuring Runtime Settings in Go

In Go, you register actor factories with the Dapr HTTP service. The actor runtime settings (idle timeout, scan interval, etc.) are configured through the `/dapr/config` endpoint response that the Dapr sidecar fetches at startup:

```go
package main

import (
  "log"
  "net/http"

  "github.com/dapr/go-sdk/actor"
  daprd "github.com/dapr/go-sdk/service/http"
)

func myActorFactory() actor.ServerContext {
  return &MyActor{}
}

func main() {
  s := daprd.NewService(":8080")
  s.RegisterActorImplFactoryContext(myActorFactory)
  if err := s.Start(); err != nil && err != http.ErrServerClosed {
    log.Fatalf("error starting service: %v", err)
  }
}
```

## Configuration via the /dapr/config Endpoint

Dapr calls your app's `/dapr/config` to fetch actor configuration at startup:

```json
{
  "entities": ["Counter", "BankAccount"],
  "actorIdleTimeout": "1h",
  "actorScanInterval": "30s",
  "drainOngoingCallTimeout": "15s",
  "drainRebalancedActors": true,
  "reentrancy": {
    "enabled": false,
    "maxStackDepth": 32
  }
}
```

## Key Settings Explained

### actorIdleTimeout

How long an actor instance remains active without any method calls or reminder firings before being deactivated:

```yaml
# Good for session actors that need fast reactivation
actorIdleTimeout: "10m"

# Good for long-running workflow actors
actorIdleTimeout: "24h"
```

### actorScanInterval

How often Dapr scans for actors that have exceeded their idle timeout:

```yaml
actorScanInterval: "30s"
```

### drainOngoingCallTimeout

Maximum time to wait for in-flight calls to complete before rebalancing an actor during a rolling upgrade:

```yaml
drainOngoingCallTimeout: "15s"
```

### drainRebalancedActors

Whether to wait for in-flight calls to drain before rebalancing:

```yaml
drainRebalancedActors: true
```

## Kubernetes Deployment with Custom Config

When deploying on Kubernetes, annotate your pod to expose the actor config endpoint:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: actor-service
spec:
  selector:
    matchLabels:
      app: actor-service
  template:
    metadata:
      labels:
        app: actor-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "actor-service"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: actor-service
        image: myregistry/actor-service:latest
        ports:
        - containerPort: 8080
```

## Best Practices

- Set shorter `actorIdleTimeout` for session actors to free memory faster.
- Use longer `actorScanInterval` in large deployments to reduce placement service load.
- Always enable `drainRebalancedActors` in production to prevent dropped calls during deployments.
- Monitor active actor count metrics to detect idle timeout misconfiguration.

## Summary

Actor runtime settings in Dapr give you fine-grained control over activation lifetime, rebalancing behavior, and concurrency options. Tuning idle timeout and scan interval to match your workload patterns reduces unnecessary state store I/O and memory usage. Always test these settings under realistic load before deploying to production.
