# How to Use Dapr State Management with .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, .NET, State Management, C#, Redis

Description: Implement Dapr state management in .NET applications with DaprClient, including CRUD operations, ETags, transactions, and state store query API.

---

## Overview

Dapr state management in .NET provides a backend-agnostic key-value API through `DaprClient`. Whether your state store is Redis, Cosmos DB, or PostgreSQL, the application code stays the same.

## Setup

```bash
dotnet add package Dapr.Client
```

```csharp
// Program.cs
builder.Services.AddDaprClient();
```

## Basic CRUD Operations

```csharp
public class StateService
{
    private readonly DaprClient _dapr;
    private const string Store = "statestore";

    public StateService(DaprClient dapr) => _dapr = dapr;

    public async Task SaveAsync<T>(string key, T value)
    {
        await _dapr.SaveStateAsync(Store, key, value);
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        return await _dapr.GetStateAsync<T>(Store, key);
    }

    public async Task DeleteAsync(string key)
    {
        await _dapr.DeleteStateAsync(Store, key);
    }
}
```

## Optimistic Concurrency with ETags

```csharp
public async Task SafeUpdate(string key, UserProfile updated)
{
    // Read with ETag
    var (current, etag) = await _dapr.GetStateAndETagAsync<UserProfile>(Store, key);

    if (current == null) throw new KeyNotFoundException(key);

    // Merge changes
    current.Email = updated.Email;
    current.UpdatedAt = DateTime.UtcNow;

    // Save with ETag - throws if another writer modified it
    bool saved = await _dapr.TrySaveStateAsync(Store, key, current, etag);
    if (!saved)
    {
        throw new InvalidOperationException("Concurrent modification detected - retry");
    }
}
```

## State Options

```csharp
// Consistency and concurrency options
var options = new StateOptions
{
    Consistency = ConsistencyMode.Strong,
    Concurrency = ConcurrencyMode.FirstWrite
};

bool saved = await _dapr.TrySaveStateAsync(Store, "user-1", user, etag, stateOptions: options);
```

## Transactions

```csharp
public async Task TransferCredits(string fromKey, string toKey, int amount)
{
    var fromBalance = await _dapr.GetStateAsync<int>(Store, fromKey);
    var toBalance = await _dapr.GetStateAsync<int>(Store, toKey);

    var operations = new List<StateTransactionRequest>
    {
        new StateTransactionRequest(fromKey, System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(fromBalance - amount), StateOperationType.Upsert),
        new StateTransactionRequest(toKey, System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(toBalance + amount), StateOperationType.Upsert),
    };

    await _dapr.ExecuteStateTransactionAsync(Store, operations);
}
```

## Bulk Operations

```csharp
// Bulk save
var items = Enumerable.Range(1, 10).Select(i =>
    new SaveStateItem<Product>($"product-{i}", new Product { Id = i, Name = $"Product {i}" })
).ToList();

await _dapr.SaveBulkStateAsync(Store, items);

// Bulk get
var keys = Enumerable.Range(1, 10).Select(i => $"product-{i}").ToList();
var results = await _dapr.GetBulkStateAsync(Store, keys, parallelism: 5);

foreach (var item in results)
{
    Console.WriteLine($"{item.Key}: {item.Value}");
}
```

## State Metadata

```csharp
// Save with TTL (if store supports it)
var metadata = new Dictionary<string, string> { ["ttlInSeconds"] = "3600" };
await _dapr.SaveStateAsync(Store, "session-abc", sessionData, metadata: metadata);
```

## Summary

DaprClient's state management API provides a clean, strongly-typed interface for key-value storage in .NET. ETag-based optimistic concurrency prevents lost updates in concurrent scenarios, while state transactions ensure atomicity for multi-key operations. The API is backend-agnostic - switching from Redis to Cosmos DB requires only a component configuration change, with no code modifications.
