# How to Use the Dapr Distributed Lock API Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Lock, API, Concurrency, Redis

Description: A practical reference for the Dapr Distributed Lock API covering lock acquisition, release, TTL, and use cases for mutual exclusion.

---

## Overview

The Dapr Distributed Lock API provides mutual exclusion across distributed services using a named lock resource. Applications acquire a lock before entering a critical section, perform their work, and release the lock. Dapr handles the backend complexity of distributed locking across supported backends like Redis.

## Base URL

```yaml
http://localhost:{daprPort}/v1.0-alpha1/lock/{storeName}
```

## Acquiring a Lock

**POST** `/v1.0-alpha1/lock/{storeName}`

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/lock/redislock \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "order-processor",
    "lockOwner": "worker-instance-1",
    "expiryInSeconds": 30
  }'
```

Success response:

```json
{
  "success": true
}
```

Failure (lock already held):

```json
{
  "success": false
}
```

## Releasing a Lock

**POST** `/v1.0-alpha1/unlock/{storeName}`

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/unlock/redislock \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "order-processor",
    "lockOwner": "worker-instance-1"
  }'
```

Response:

```json
{
  "status": 0
}
```

## Lock Status Codes

| Status Code | Name | Description |
|---|---|---|
| 0 | SUCCESS | Lock released successfully |
| 1 | LOCK_DOES_NOT_EXIST | Lock not found or already expired |
| 2 | LOCK_BELONGS_TO_OTHERS | Lock held by a different owner |
| 3 | INTERNAL_ERROR | Backend error |

## Redis Lock Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redislock
spec:
  type: lock.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-master:6379
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
```

## Using the SDK (Go)

```go
package main

import (
    dapr "github.com/dapr/go-sdk/client"
    "context"
    "fmt"
    "github.com/google/uuid"
)

func processOrderExclusively(orderId string) error {
    client, _ := dapr.NewClient()
    defer client.Close()

    lockOwner := uuid.New().String()
    ctx := context.Background()

    // Acquire lock
    resp, err := client.TryLockAlpha1(ctx, "redislock", &dapr.LockRequest{
        LockOwner:         lockOwner,
        ResourceID:        "order-" + orderId,
        ExpiryInSeconds:   30,
    })
    if err != nil || !resp.Success {
        return fmt.Errorf("failed to acquire lock for order %s", orderId)
    }
    defer client.UnlockAlpha1(ctx, "redislock", &dapr.UnlockRequest{
        LockOwner:  lockOwner,
        ResourceID: "order-" + orderId,
    })

    // Critical section
    return processOrder(orderId)
}
```

## Practical Use Cases

1. **Preventing duplicate order processing** - lock by order ID before charging
2. **Database schema migrations** - lock before running ALTER TABLE
3. **Cron job deduplication** - only one instance of a scheduled job runs at a time
4. **Inventory reservation** - prevent overselling high-demand items

## Lock TTL Best Practices

Always set an expiry time longer than your operation's expected duration to prevent the lock from expiring before the work completes. The TTL acts as a safety net: if your process crashes, the lock is automatically released after expiry instead of being held indefinitely:

```bash
# Good: 30s expiry for an operation that takes 5s
expiryInSeconds: 30

# Bad: 0 or very long expiry
```

## Summary

The Dapr Distributed Lock API provides a simple acquire-and-release interface for mutual exclusion across distributed services. The TTL-based expiry ensures locks are automatically released if a holder crashes. Use unique lock owner IDs per request to ensure only the correct holder can release the lock.
