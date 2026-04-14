# How to Use Dapr Distributed Lock for Singleton Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Lock, Singleton, Leader Election, Kubernetes

Description: Implement singleton service behavior in Kubernetes using Dapr distributed locks, ensuring only one active instance performs exclusive operations across a deployment.

---

Some services must run as singletons - only one active instance at a time. Examples include scheduler services, data synchronization workers, and cache warming tasks. In Kubernetes, you cannot always use `replicas: 1` because redundancy is required for failover. Dapr distributed locks let you implement singleton behavior with multiple replicas.

## The Singleton Problem in Kubernetes

With `replicas: 3`, all 3 pods start and run simultaneously. For a singleton task:
- You need at least 2 pods available for HA
- But only 1 pod should be actively performing the singleton task
- If the active pod dies, another should take over within seconds

## Singleton Lock Pattern

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
    lockStore    = "lockstore"
    singletonKey = "data-sync-singleton"
    lockExpiry   = 20
    heartbeat    = 15 * time.Second
)

var podName = os.Getenv("POD_NAME")

type SingletonService struct {
    client   dapr.Client
    isLeader bool
}

func (s *SingletonService) Run() {
    for {
        resp, err := s.client.TryLockAlpha1(context.Background(), lockStore, &dapr.LockRequest{
            LockOwner:       podName,
            ResourceID:      singletonKey,
            ExpiryInSeconds: lockExpiry,
        })

        if err != nil {
            fmt.Printf("Lock error: %v\n", err)
            time.Sleep(heartbeat)
            continue
        }

        if resp.Success {
            if !s.isLeader {
                fmt.Printf("[%s] Became singleton - starting active work\n", podName)
                s.isLeader = true
                go s.doWork()
            }
        } else {
            if s.isLeader {
                fmt.Printf("[%s] Lost singleton status\n", podName)
                s.isLeader = false
                s.stopWork()
            }
        }

        time.Sleep(heartbeat)
    }
}
```

## Starting and Stopping Work Safely

```go
var workCancel context.CancelFunc

func (s *SingletonService) doWork() {
    ctx, cancel := context.WithCancel(context.Background())
    workCancel = cancel

    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            fmt.Println("Singleton work stopped")
            return
        case <-ticker.C:
            syncData()
        }
    }
}

func (s *SingletonService) stopWork() {
    if workCancel != nil {
        workCancel()
    }
}
```

## Graceful Shutdown

Release the lock on SIGTERM so another instance takes over immediately:

```go
import (
    "os/signal"
    "syscall"
)

func main() {
    client, _ := dapr.NewClient()
    svc := &SingletonService{client: client}

    go svc.Run()

    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGTERM, syscall.SIGINT)
    <-stop

    fmt.Println("Shutting down - releasing singleton lock")
    client.UnlockAlpha1(context.Background(), lockStore, &dapr.UnlockRequest{
        LockOwner:  podName,
        ResourceID: singletonKey,
    })
}
```

## Kubernetes Deployment Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-sync
spec:
  replicas: 3
  selector:
    matchLabels:
      app: data-sync
  template:
    metadata:
      labels:
        app: data-sync
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "data-sync"
    spec:
      containers:
      - name: data-sync
        image: data-sync:latest
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
```

## Monitoring Singleton Status

Expose a health endpoint that indicates whether the pod is the active singleton:

```go
http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
    status := map[string]interface{}{
        "pod":      podName,
        "active":   svc.isLeader,
        "role":     "standby",
    }
    if svc.isLeader {
        status["role"] = "active"
    }
    json.NewEncoder(w).Encode(status)
})
```

## Summary

Dapr distributed locks enable singleton service patterns in Kubernetes without sacrificing redundancy. By running multiple replicas where only the lock holder performs active work, you get both high availability and singleton semantics. Heartbeat-based lock renewal keeps the singleton stable, while graceful shutdown on SIGTERM minimizes failover time when pods are replaced.
