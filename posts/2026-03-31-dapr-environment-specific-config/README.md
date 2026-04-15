# How to Implement Environment-Specific Config with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, Environment, Kubernetes, DevOps

Description: Use the Dapr Configuration API with namespace-scoped stores to maintain separate dev, staging, and production configs without code changes.

---

## The Problem with Hardcoded Environments

Applications often bake environment differences into code or environment variables. Dapr's Configuration API provides a better approach: a watched config store where each environment has its own namespace or key prefix, and services subscribe to live changes.

## Configuring a Redis-Backed Config Store

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: app-config
  namespace: production
spec:
  type: configuration.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-prod.internal:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
```

Repeat this component manifest for `namespace: staging` and `namespace: development`, pointing to separate Redis instances.

## Seeding Environment-Specific Values

```bash
# Development
redis-cli -h redis-dev.internal SET "maxConnections" "10"
redis-cli -h redis-dev.internal SET "logLevel" "debug"

# Production
redis-cli -h redis-prod.internal SET "maxConnections" "500"
redis-cli -h redis-prod.internal SET "logLevel" "warn"
```

## Reading Config at Startup

```go
package main

import (
    "context"
    "fmt"
    "log"

    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    ctx := context.Background()
    items, err := client.GetConfigurationItems(ctx, "app-config",
        []string{"maxConnections", "logLevel"})
    if err != nil {
        log.Fatal(err)
    }

    for key, item := range items {
        fmt.Printf("%s = %s\n", key, item.Value)
    }
}
```

## Subscribing to Live Config Changes

```go
func watchConfig(client dapr.Client) {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    _, err := client.SubscribeConfigurationItems(ctx, "app-config",
        []string{"maxConnections", "logLevel"}, func(id string, items map[string]*dapr.ConfigurationItem) {
            for key, item := range items {
                fmt.Printf("Config changed: %s = %s\n", key, item.Value)
                applyConfig(key, item.Value)
            }
        })
    if err != nil {
        log.Fatal(err)
    }
    // Block forever; cancel ctx to unsubscribe
    select {}
}
```

## Kubernetes Namespace Isolation

```yaml
# Deploy to production namespace - picks up production config component
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "api-gateway"
```

Because the Dapr Configuration component is scoped to `namespace: production`, the same app-id deployed in `namespace: staging` automatically picks up the staging Redis store. No code change required.

## Summary

Dapr's Configuration API combined with Kubernetes namespace-scoped components gives you clean environment separation without environment variables or config file management. Services subscribe to changes and reload at runtime, eliminating the need for rolling restarts when configuration values change.
