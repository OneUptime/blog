# How to Use Dapr Distributed Lock for Leader Election

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Lock, Leader Election, High Availability, Redis

Description: Implement leader election in microservices using the Dapr Distributed Lock API so only one instance performs scheduled or singleton tasks at a time.

---

Leader election ensures only one instance of a horizontally scaled service performs a specific task - like running a cron job, draining a queue, or managing a resource. Dapr's Distributed Lock API provides a simple mechanism for implementing this pattern without external coordination services.

## How Lock-Based Leader Election Works

1. All instances periodically attempt to acquire a shared lock.
2. The instance that succeeds becomes the leader and performs the work.
3. The leader renews the lock before it expires to retain leadership.
4. If the leader crashes, the lock expires and another instance takes over.

## Component Setup

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: lockstore
spec:
  type: lock.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
```

## Leader Election Implementation in Go

```go
package main

import (
    "context"
    "fmt"
    "os"
    "time"

    dapr "github.com/dapr/go-sdk/client"
)

const (
    lockStore  = "lockstore"
    resourceID = "scheduler-leader"
    expiry     = 15
    renewEvery = 10 * time.Second
)

func tryBecomeLeader(client dapr.Client) bool {
    hostname, _ := os.Hostname()
    resp, err := client.TryLockAlpha1(context.Background(), lockStore, &dapr.LockRequest{
        LockOwner:       hostname,
        ResourceID:      resourceID,
        ExpiryInSeconds: expiry,
    })
    if err != nil {
        fmt.Printf("Lock error: %v\n", err)
        return false
    }
    return resp.Success
}

func releaseLeadership(client dapr.Client) {
    hostname, _ := os.Hostname()
    client.UnlockAlpha1(context.Background(), lockStore, &dapr.UnlockRequest{
        LockOwner:  hostname,
        ResourceID: resourceID,
    })
}

func runAsLeader() {
    fmt.Println("I am the leader - running scheduled task")
    // Perform leader-only work here
}

func main() {
    client, _ := dapr.NewClient()
    defer client.Close()

    for {
        isLeader := tryBecomeLeader(client)
        if isLeader {
            go func() {
                defer releaseLeadership(client)
                runAsLeader()
            }()
        } else {
            fmt.Println("Not the leader - standing by")
        }
        time.Sleep(renewEvery)
    }
}
```

## Renewing Leadership

To hold leadership across multiple intervals, release the current lock and immediately re-acquire it before another instance can claim it:

```go
func renewLeadership(client dapr.Client) bool {
    hostname, _ := os.Hostname()
    // Release the current lock first - TryLockAlpha1 uses SetNX internally,
    // which fails if the key already exists, even for the same owner.
    client.UnlockAlpha1(context.Background(), lockStore, &dapr.UnlockRequest{
        LockOwner:  hostname,
        ResourceID: resourceID,
    })
    resp, _ := client.TryLockAlpha1(context.Background(), lockStore, &dapr.LockRequest{
        LockOwner:       hostname,
        ResourceID:      resourceID,
        ExpiryInSeconds: expiry,
    })
    return resp.Success
}
```

Call `renewLeadership` every `renewEvery` seconds. Note that there is a brief window between unlock and re-lock where another instance could acquire the lock. If renewal fails, stop leader tasks gracefully.

## Simulating Failover

Kill the leader process and observe another instance taking over:

```bash
# On leader instance
kill -9 $(pgrep -f scheduler)

# On another instance - it should acquire the lock after TTL expires
# TTL is 15 seconds in this example
```

## Kubernetes Deployment

When running in Kubernetes, use the pod name as the lock owner:

```go
instanceID := os.Getenv("POD_NAME")
```

Set `POD_NAME` via the downward API:

```yaml
env:
- name: POD_NAME
  valueFrom:
    fieldRef:
      fieldPath: metadata.name
```

## Summary

Dapr distributed locks provide a lightweight leader election mechanism. Each instance races to acquire a named lock, and only the winner performs leader tasks. Automatic lock expiry ensures leadership transfers within a bounded time window when a leader crashes. Pair this with lock renewal to maintain stable leadership without churn.
