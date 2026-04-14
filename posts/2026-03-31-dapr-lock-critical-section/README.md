# How to Use Dapr Distributed Lock for Critical Section Protection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Lock, Critical Section, Concurrency, Microservice

Description: Protect critical sections in distributed microservices using Dapr locks, ensuring only one thread or instance executes sensitive operations at any given time.

---

A critical section is a code path that must not run concurrently - for example, debiting an account, updating shared state, or triggering an external action exactly once. In a distributed system, thread-level synchronization is not sufficient; you need distributed coordination. Dapr's lock API provides that.

## What Makes a Critical Section?

A section is critical when:
- It reads and writes shared state that must be consistent
- The operation is not idempotent and cannot be safely duplicated
- Race conditions could cause data corruption or incorrect outcomes

## Basic Critical Section Pattern

```go
package main

import (
    "context"
    "fmt"
    "os"
    dapr "github.com/dapr/go-sdk/client"
)

var owner, _ = os.Hostname()

func withLock(client dapr.Client, resourceID string, fn func() error) error {
    resp, err := client.TryLockAlpha1(context.Background(), "lockstore", &dapr.LockRequest{
        LockOwner:       owner,
        ResourceID:      resourceID,
        ExpiryInSeconds: 30,
    })
    if err != nil {
        return fmt.Errorf("lock error: %w", err)
    }
    if !resp.Success {
        return fmt.Errorf("lock unavailable for %s", resourceID)
    }
    defer client.UnlockAlpha1(context.Background(), "lockstore", &dapr.UnlockRequest{
        LockOwner:  owner,
        ResourceID: resourceID,
    })
    return fn()
}
```

## Protecting Account Debit Operations

Without locks, two concurrent debit requests could both read the same balance and overdraw:

```go
func debitAccount(client dapr.Client, accountID string, amount float64) error {
    return withLock(client, "account-"+accountID, func() error {
        balance, err := getBalance(accountID)
        if err != nil {
            return err
        }
        if balance < amount {
            return fmt.Errorf("insufficient funds")
        }
        return setBalance(accountID, balance-amount)
    })
}
```

## Protecting Inventory Updates

Prevent overselling in an e-commerce system:

```go
func reserveItem(client dapr.Client, sku string, quantity int) error {
    return withLock(client, "inventory-"+sku, func() error {
        stock, err := getStock(sku)
        if err != nil {
            return err
        }
        if stock < quantity {
            return fmt.Errorf("insufficient stock for SKU %s", sku)
        }
        return setStock(sku, stock-quantity)
    })
}
```

## Protecting External Trigger Operations

Prevent duplicate webhook or notification delivery:

```go
func sendNotification(client dapr.Client, notifID string, payload Notification) error {
    return withLock(client, "notif-"+notifID, func() error {
        if alreadySent(notifID) {
            fmt.Printf("Notification %s already sent\n", notifID)
            return nil
        }
        err := deliverNotification(payload)
        if err != nil {
            return err
        }
        return markAsSent(notifID)
    })
}
```

## Nested Critical Sections - Avoid Deadlocks

Never nest locks for different resources in opposite order across code paths. If Service A locks `resource-1` then `resource-2`, Service B must do the same order:

```go
// Safe: always lock in alphabetical/numeric order
func transferFunds(client dapr.Client, fromID, toID string, amount float64) error {
    first, second := fromID, toID
    if fromID > toID {
        first, second = toID, fromID
    }
    return withLock(client, "account-"+first, func() error {
        return withLock(client, "account-"+second, func() error {
            return doTransfer(fromID, toID, amount)
        })
    })
}
```

## Timeout Strategy for Critical Sections

If you cannot acquire the lock within a deadline, fail fast rather than blocking indefinitely:

```go
func tryWithTimeout(client dapr.Client, resourceID string, fn func() error) error {
    deadline := time.Now().Add(5 * time.Second)
    for time.Now().Before(deadline) {
        resp, err := client.TryLockAlpha1(context.Background(), "lockstore", &dapr.LockRequest{
            LockOwner: owner, ResourceID: resourceID, ExpiryInSeconds: 30,
        })
        if err == nil && resp.Success {
            defer unlockResource(client, resourceID)
            return fn()
        }
        time.Sleep(200 * time.Millisecond)
    }
    return fmt.Errorf("timeout acquiring lock for %s", resourceID)
}
```

## Summary

Dapr distributed locks protect critical sections across microservice instances by ensuring mutual exclusion on a named resource. The `withLock` wrapper pattern makes it easy to protect any operation. For multi-resource operations, always acquire locks in a consistent order to prevent deadlocks. Use timeouts on lock acquisition to avoid indefinite blocking under contention.
