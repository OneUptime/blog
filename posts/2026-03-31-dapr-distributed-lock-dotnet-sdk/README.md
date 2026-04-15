# How to Use Dapr Distributed Lock with .NET SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, .NET, Distributed Lock, C#, Concurrency

Description: Acquire and release distributed locks in .NET using the Dapr Lock API to prevent concurrent access to shared resources across multiple service instances.

---

## Overview

Dapr distributed locks provide mutual exclusion across service instances backed by Redis or other lock stores. The .NET SDK offers both a low-level lock API and a convenience wrapper for safe lock management.

## Prerequisites

```bash
dotnet add package Dapr.Client
```

Configure a lock store component:

```yaml
# lockstore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: lockstore
spec:
  type: lock.redis
  version: v1
  metadata:
    - name: redisHost
      value: "localhost:6379"
    - name: redisPassword
      value: ""
```

## Step 1: Acquire and Release a Lock

```csharp
using Dapr.Client;

public class InventoryService
{
    private readonly DaprClient _dapr;
    private const string LockStore = "lockstore";

    public InventoryService(DaprClient dapr) => _dapr = dapr;

    public async Task UpdateInventory(string itemId, int delta)
    {
        var lockName = $"inventory-{itemId}";
        var ownerId = Guid.NewGuid().ToString();

        // Acquire lock (30 second expiry)
        var lockResponse = await _dapr.Lock(LockStore, lockName, ownerId, 30);

        if (!lockResponse.Success)
        {
            throw new InvalidOperationException($"Could not acquire lock for item {itemId}");
        }

        try
        {
            // Critical section - only one instance runs this at a time
            var stock = await _dapr.GetStateAsync<int>("statestore", $"stock-{itemId}");
            stock += delta;

            if (stock < 0) throw new InvalidOperationException("Insufficient stock");

            await _dapr.SaveStateAsync("statestore", $"stock-{itemId}", stock);
        }
        finally
        {
            // Always release the lock
            await _dapr.Unlock(LockStore, lockName, ownerId);
        }
    }
}
```

## Step 2: Use TryLock Pattern

```csharp
public async Task<bool> TryProcessOrder(string orderId)
{
    var ownerId = Guid.NewGuid().ToString();
    var lockResult = await _dapr.Lock("lockstore", $"order-{orderId}", ownerId, 60);

    if (!lockResult.Success)
    {
        Console.WriteLine($"Order {orderId} is being processed by another instance");
        return false;
    }

    try
    {
        await ProcessOrderInternally(orderId);
        return true;
    }
    finally
    {
        await _dapr.Unlock("lockstore", $"order-{orderId}", ownerId);
    }
}
```

## Step 3: Lock Helper Extension

Create a reusable helper for safe lock management:

```csharp
public static class DaprLockExtensions
{
    public static async Task<T> WithLock<T>(
        this DaprClient dapr,
        string storeName,
        string resourceId,
        int expirySeconds,
        Func<Task<T>> action)
    {
        var ownerId = Guid.NewGuid().ToString();
        var lockResult = await dapr.Lock(storeName, resourceId, ownerId, expirySeconds);

        if (!lockResult.Success)
            throw new InvalidOperationException($"Failed to acquire lock: {resourceId}");

        try
        {
            return await action();
        }
        finally
        {
            await dapr.Unlock(storeName, resourceId, ownerId);
        }
    }
}

// Usage
var result = await _dapr.WithLock(
    "lockstore",
    $"payment-{orderId}",
    expirySeconds: 30,
    async () =>
    {
        return await _paymentService.ProcessPayment(orderId);
    }
);
```

## Step 4: Leader Election Pattern

```csharp
public async Task LeaderOnlyTask()
{
    var leaderId = Environment.MachineName;
    var lockResult = await _dapr.Lock("lockstore", "leader-election", leaderId, 60);

    if (lockResult.Success)
    {
        try
        {
            Console.WriteLine($"{leaderId} is leader - running scheduled task");
            await RunLeaderTask();
        }
        finally
        {
            await _dapr.Unlock("lockstore", "leader-election", leaderId);
        }
    }
}
```

## Summary

Dapr distributed locks in .NET provide a simple API for mutual exclusion across service instances. The `Lock` and `Unlock` methods work with any configured lock store (Redis, Zookeeper, etc.) without changing application code. Always release locks in a `finally` block to prevent deadlocks, and use sufficiently short expiry times so locks self-expire if the holder crashes.
