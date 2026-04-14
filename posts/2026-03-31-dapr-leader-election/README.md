# How to Implement Leader Election with Dapr Distributed Lock

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Leader Election, Distributed Lock, Concurrency, Pattern

Description: Learn how to implement leader election using Dapr's distributed lock API to coordinate singleton tasks across multiple service replicas.

---

## Overview

Leader election ensures that only one instance of a service performs a specific task at a time - useful for scheduled jobs, singleton processors, and coordination tasks. Dapr's distributed lock building block provides the locking primitive needed for leader election.

## Distributed Lock Component

Configure a Redis-backed lock store:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: lockstore
  namespace: default
spec:
  type: lock.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
```

## Basic Leader Election

```go
package main

import (
    "context"
    "log"
    "os"
    "time"
    dapr "github.com/dapr/go-sdk/client"
)

const (
    lockStore    = "lockstore"
    leaderKey    = "scheduler-leader"
    lockDuration = 30 * time.Second
)

type LeaderElection struct {
    client     dapr.Client
    instanceID string
    isLeader   bool
}

func NewLeaderElection() (*LeaderElection, error) {
    client, err := dapr.NewClient()
    if err != nil {
        return nil, err
    }
    return &LeaderElection{
        client:     client,
        instanceID: os.Getenv("POD_NAME"),
    }, nil
}

func (le *LeaderElection) TryBecomeLeader(ctx context.Context) (bool, string, error) {
    resp, err := le.client.TryLockAlpha1(ctx, lockStore, &dapr.LockRequest{
        LockOwner:         le.instanceID,
        ResourceID:        leaderKey,
        ExpiryInSeconds:   int32(lockDuration.Seconds()),
    })
    if err != nil {
        return false, "", err
    }
    le.isLeader = resp.Success
    return resp.Success, le.instanceID, nil
}

func (le *LeaderElection) StepDown(ctx context.Context) error {
    _, err := le.client.UnlockAlpha1(ctx, lockStore, &dapr.UnlockRequest{
        LockOwner:  le.instanceID,
        ResourceID: leaderKey,
    })
    le.isLeader = false
    return err
}
```

## Continuous Leader Election Loop

```go
func (le *LeaderElection) Run(ctx context.Context, task func(ctx context.Context) error) {
    for {
        select {
        case <-ctx.Done():
            le.StepDown(context.Background())
            return
        default:
        }

        isLeader, _, err := le.TryBecomeLeader(ctx)
        if err != nil {
            log.Printf("Lock attempt failed: %v", err)
            time.Sleep(5 * time.Second)
            continue
        }

        if isLeader {
            log.Printf("Instance %s is now the leader", le.instanceID)

            // Run the leader task
            taskCtx, cancel := context.WithTimeout(ctx, lockDuration-5*time.Second)
            if err := task(taskCtx); err != nil {
                log.Printf("Leader task error: %v", err)
            }
            cancel()

            le.StepDown(ctx)
        } else {
            log.Printf("Not the leader, waiting...")
            time.Sleep(5 * time.Second)
        }
    }
}
```

## Example: Scheduled Batch Job with Leader Election

```go
func main() {
    le, err := NewLeaderElection()
    if err != nil {
        panic(err)
    }

    ctx := context.Background()
    ticker := time.NewTicker(1 * time.Minute)

    for range ticker.C {
        isLeader, _, err := le.TryBecomeLeader(ctx)
        if err != nil {
            log.Printf("Election failed: %v", err)
            continue
        }

        if isLeader {
            log.Println("Running scheduled batch job as leader")
            if err := runBatchJob(ctx); err != nil {
                log.Printf("Batch job failed: %v", err)
            }
            le.StepDown(ctx)
        }
    }
}

func runBatchJob(ctx context.Context) error {
    log.Println("Processing stale orders...")
    // Only one replica will execute this
    return processStaleOrders(ctx)
}
```

## Deploying with Multiple Replicas

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scheduler
spec:
  replicas: 3  # Only one will be leader at a time
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "scheduler"
    spec:
      containers:
        - name: scheduler
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
```

## Summary

Dapr's distributed lock API provides the foundation for leader election across multiple service replicas. By acquiring a time-limited lock before performing work, only one instance runs singleton tasks at a time. Lock expiry ensures automatic failover if the leader crashes, making this pattern resilient to instance failures.
