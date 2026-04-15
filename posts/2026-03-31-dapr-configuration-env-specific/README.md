# How to Use Dapr Configuration for Environment-Specific Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration Management, Environment, DevOps, Microservice

Description: Learn how to manage environment-specific application settings using the Dapr Configuration API with separate stores or key prefixes per environment.

---

Managing different configuration values across development, staging, and production environments is a universal challenge. Dapr's Configuration API supports two main strategies: separate configuration store components per environment, or a shared store with key prefixes. This guide covers both approaches with practical examples.

## Strategy 1: Separate Component Per Environment

Define a different configuration store component in each Kubernetes namespace:

```yaml
# production namespace
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: appconfig
  namespace: production
spec:
  type: configuration.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis.production.svc.cluster.local:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
```

```yaml
# staging namespace
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: appconfig
  namespace: staging
spec:
  type: configuration.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis.staging.svc.cluster.local:6379"
```

The component name `appconfig` is identical in both namespaces. Application code does not change - it always calls the same component name.

Set different values per environment:

```bash
# Production values
redis-cli -h redis.production SET log-level "warn"
redis-cli -h redis.production SET max-connections "200"
redis-cli -h redis.production SET cache-ttl "3600"

# Staging values
redis-cli -h redis.staging SET log-level "debug"
redis-cli -h redis.staging SET max-connections "20"
redis-cli -h redis.staging SET cache-ttl "60"
```

## Strategy 2: Shared Store with Environment Prefixes

For simpler setups, use a single Redis instance with environment-prefixed keys:

```bash
# Production
redis-cli SET prod.log-level "warn"
redis-cli SET prod.max-connections "200"

# Staging
redis-cli SET staging.log-level "debug"
redis-cli SET staging.max-connections "20"

# Development
redis-cli SET dev.log-level "debug"
redis-cli SET dev.max-connections "5"
```

Configure the component to point at the shared Redis instance. The environment prefix is handled in application code, not in the component definition:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: appconfig
spec:
  type: configuration.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
```

## Loading Environment Config at Startup

```go
package config

import (
    "context"
    "fmt"
    "os"

    dapr "github.com/dapr/go-sdk/client"
)

type AppConfig struct {
    LogLevel       string
    MaxConnections int
    CacheTTL       int
}

func Load(ctx context.Context) (*AppConfig, error) {
    client, err := dapr.NewClient()
    if err != nil {
        return nil, fmt.Errorf("failed to create dapr client: %w", err)
    }
    defer client.Close()

    // For Strategy 1 (separate stores), use keys directly: "log-level"
    // For Strategy 2 (shared store), prefix keys with the environment
    env := os.Getenv("APP_ENV") // "prod", "staging", "dev"
    prefix := env + "."

    items, err := client.GetConfigurationItems(ctx, "appconfig", []string{
        prefix + "log-level",
        prefix + "max-connections",
        prefix + "cache-ttl",
    })
    if err != nil {
        return nil, err
    }

    cfg := &AppConfig{
        LogLevel:       getStr(items, prefix+"log-level", "info"),
        MaxConnections: getInt(items, prefix+"max-connections", 10),
        CacheTTL:       getInt(items, prefix+"cache-ttl", 300),
    }
    return cfg, nil
}
```

## Promoting Configuration from Staging to Production

```bash
#!/bin/bash
# promote-config.sh - copy staging config to production

KEYS=("log-level" "max-connections" "cache-ttl")

for key in "${KEYS[@]}"; do
  VALUE=$(redis-cli -h redis.staging GET "${key}")
  echo "Promoting ${key}=${VALUE} to production"
  redis-cli -h redis.production SET "${key}" "${VALUE}"
done
```

## Summary

Dapr supports environment-specific configuration through either separate Redis instances per namespace or a shared store with key prefixes. The separate namespace approach is cleaner for strong isolation between environments, while key prefixes work well for smaller teams. In both cases, application code is identical - only the Dapr component definition or key prefix changes per environment.
