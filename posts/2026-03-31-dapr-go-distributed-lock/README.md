# How to Use Dapr Distributed Lock with Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, Distributed Lock, Concurrency, Microservice, SDK

Description: Coordinate access to shared resources across Go microservices using the Dapr Distributed Lock building block backed by Redis or other lock providers.

---

## Overview

The Dapr Distributed Lock building block enables Go microservices to acquire and release mutual-exclusion locks across process and host boundaries. This is useful for leader election, preventing duplicate job execution, and protecting shared external resources.

## Configuring the Lock Store

```yaml
# components/lock-store.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: lock-store
spec:
  type: lock.redis
  version: v1
  metadata:
    - name: redisHost
      value: "localhost:6379"
    - name: redisPassword
      value: ""
```

## Acquiring and Releasing a Lock

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    ctx := context.Background()

    // Acquire a lock for 30 seconds
    resp, err := client.TryLockAlpha1(ctx, "lock-store", &dapr.LockRequest{
        LockOwner:         "worker-1",
        ResourceID:        "payment-processor",
        ExpiryInSeconds:   30,
    })
    if err != nil {
        log.Fatalf("lock request failed: %v", err)
    }

    if !resp.Success {
        fmt.Println("Could not acquire lock - another instance is running")
        return
    }

    defer func() {
        unlockResp, err := client.UnlockAlpha1(ctx, "lock-store", &dapr.UnlockRequest{
            LockOwner:  "worker-1",
            ResourceID: "payment-processor",
        })
        if err != nil || unlockResp.Status != "SUCCESS" {
            log.Printf("failed to release lock: %v", err)
        }
    }()

    fmt.Println("Lock acquired - processing payments...")
    time.Sleep(5 * time.Second) // simulate work
    fmt.Println("Processing complete")
}
```

## Helper Function for Lock-Protected Work

Wrap lock acquisition in a helper to ensure the lock is always released:

```go
func withLock(ctx context.Context, client dapr.Client,
    store, resource, owner string, ttlSec int32, fn func() error) error {

    resp, err := client.TryLockAlpha1(ctx, store, &dapr.LockRequest{
        LockOwner:       owner,
        ResourceID:      resource,
        ExpiryInSeconds: ttlSec,
    })
    if err != nil {
        return fmt.Errorf("lock request error: %w", err)
    }
    if !resp.Success {
        return fmt.Errorf("lock %s/%s is held by another owner", store, resource)
    }

    defer client.UnlockAlpha1(ctx, store, &dapr.UnlockRequest{
        LockOwner:  owner,
        ResourceID: resource,
    })

    return fn()
}

// Usage
err = withLock(ctx, client, "lock-store", "report-generator", "svc-1", 60, func() error {
    log.Println("Generating report...")
    return generateReport()
})
```

## Generating a Unique Lock Owner ID

```go
import (
    "fmt"
    "os"

    "github.com/google/uuid"
)

func instanceID() string {
    hostname, _ := os.Hostname()
    return fmt.Sprintf("%s-%s", hostname, uuid.New().String()[:8])
}
```

## Handling Lock Expiry

Set the TTL conservatively and renew the lock if your operation may take longer:

```go
// Re-acquire the lock before expiry if long-running work is expected
go func() {
    ticker := time.NewTicker(20 * time.Second)
    defer ticker.Stop()
    for range ticker.C {
        client.TryLockAlpha1(ctx, "lock-store", &dapr.LockRequest{
            LockOwner:       owner,
            ResourceID:      "payment-processor",
            ExpiryInSeconds: 30, // reset TTL
        })
    }
}()
```

## Summary

The Dapr Distributed Lock API in Go exposes two functions: `TryLockAlpha1` to attempt acquisition and `UnlockAlpha1` to release. By wrapping these in a helper that guarantees release via `defer`, you can prevent distributed race conditions without importing Redis or Zookeeper client libraries directly into your service.
