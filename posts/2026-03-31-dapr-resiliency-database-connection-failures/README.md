# How to Use Dapr Resiliency for Database Connection Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resilience, Database, State Store, Kubernetes

Description: Configure Dapr resiliency policies to handle database connection failures with automatic retries, timeouts, and circuit breakers for state store components.

---

## Why Database Connections Fail

Database connections can fail due to network blips, pod restarts, connection pool exhaustion, or maintenance windows. Dapr resiliency policies let you define retry and circuit breaker behavior for state store operations without changing application code.

## Configuring Resiliency for a State Store

Create a resiliency policy targeting your state store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: db-resiliency
  namespace: default
spec:
  policies:
    retries:
      dbRetry:
        policy: exponential
        maxInterval: 10s
        maxRetries: 5
    timeouts:
      dbTimeout: 5s
    circuitBreakers:
      dbCB:
        maxRequests: 1
        interval: 20s
        timeout: 60s
        trip: consecutiveFailures >= 3
  targets:
    components:
      statestore:
        outbound:
          retry: dbRetry
          timeout: dbTimeout
          circuitBreaker: dbCB
```

```bash
kubectl apply -f db-resiliency.yaml
```

## Defining the State Store Component

Here is a PostgreSQL state store component using the Dapr PostgreSQL component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.postgresql
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: postgres-secret
      key: connectionString
  - name: maxConns
    value: "5"
  - name: connectionMaxIdleTime
    value: "30s"
```

```bash
kubectl apply -f statestore-component.yaml
```

## Reading State with Error Handling in Go

```go
package main

import (
    "context"
    "fmt"
    "log"
    dapr "github.com/dapr/go-sdk/client"
)

func getUser(ctx context.Context, client dapr.Client, userID string) (*dapr.StateItem, error) {
    item, err := client.GetState(ctx, "statestore", userID, nil)
    if err != nil {
        // Dapr applies retries before returning this error
        log.Printf("State store unavailable after retries: %v", err)
        return nil, fmt.Errorf("database unavailable: %w", err)
    }
    return item, nil
}
```

## Saving State with Retry Awareness

```go
func saveUser(ctx context.Context, client dapr.Client, userID string, data []byte) error {
    err := client.SaveState(ctx, "statestore", userID, data, nil)
    if err != nil {
        log.Printf("Failed to save state for user %s: %v", userID, err)
        // Publish to dead-letter queue for later replay
        return err
    }
    return nil
}
```

## Testing the Resiliency Policy

Scale down your database to simulate a failure and observe Dapr retry behavior:

```bash
kubectl scale deployment postgres --replicas=0 -n default
# Trigger a state store operation from your app
kubectl logs -l app=myapp -c daprd --tail=50 | grep -i "retry\|state\|error"
# Restore the database
kubectl scale deployment postgres --replicas=1 -n default
```

## Summary

Dapr resiliency policies applied to state store components automatically retry failed database operations using exponential backoff and trip a circuit breaker after consecutive failures. This protects your application from cascading failures during database maintenance or transient network issues without requiring any changes to business logic.
