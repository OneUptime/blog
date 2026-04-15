# How to Use DaprClient in .NET Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, .NET, DaprClient, C#, SDK

Description: Learn to use DaprClient in .NET for state management, service invocation, pub/sub, and secrets with practical code examples and best practices.

---

## Overview

`DaprClient` is the primary entry point for all Dapr building blocks in .NET. It provides strongly-typed methods for state, pub/sub, service invocation, secrets, and bindings. This guide covers its core capabilities with working examples.

## Prerequisites

```bash
dotnet add package Dapr.Client
dotnet add package Dapr.AspNetCore  # Required for AddDaprClient() DI registration
```

## Creating DaprClient

```csharp
// Via dependency injection (recommended)
builder.Services.AddDaprClient();

// Manual creation
using var client = new DaprClientBuilder().Build();
```

## State Management

```csharp
public class ProductService
{
    private readonly DaprClient _client;
    private const string StoreName = "statestore";

    public ProductService(DaprClient client) => _client = client;

    public async Task SaveProduct(Product product)
    {
        await _client.SaveStateAsync(StoreName, product.Id, product);
    }

    public async Task<Product?> GetProduct(string id)
    {
        return await _client.GetStateAsync<Product>(StoreName, id);
    }

    public async Task<(Product?, string?)> GetProductWithETag(string id)
    {
        var (value, etag) = await _client.GetStateAndETagAsync<Product>(StoreName, id);
        return (value, etag);
    }

    public async Task UpdateProduct(Product product, string etag)
    {
        bool success = await _client.TrySaveStateAsync(StoreName, product.Id, product, etag);
        if (!success) throw new Exception("Concurrency conflict");
    }

    public async Task DeleteProduct(string id)
    {
        await _client.DeleteStateAsync(StoreName, id);
    }
}
```

## Service Invocation

> **Note:** The `InvokeMethodAsync` methods are marked `[Obsolete]` in the current Dapr .NET SDK. The recommended approach is to use `DaprClient.CreateInvokeHttpClient()` or a native gRPC client for service invocation. The examples below still compile and work, but will produce compiler warnings.

```csharp
public class OrderService
{
    private readonly DaprClient _client;

    public OrderService(DaprClient client) => _client = client;

    public async Task<StockInfo> GetStock(string itemId)
    {
        return await _client.InvokeMethodAsync<StockInfo>(
            HttpMethod.Get,
            "inventory-service",    // app-id
            $"stock/{itemId}"       // method
        );
    }

    public async Task<OrderResult> PlaceOrder(OrderRequest request)
    {
        return await _client.InvokeMethodAsync<OrderRequest, OrderResult>(
            HttpMethod.Post,
            "payment-service",
            "process",
            request
        );
    }
}
```

## Pub/Sub

```csharp
// Publish
await _client.PublishEventAsync(
    "pubsub",           // component name
    "order-created",    // topic
    new OrderCreated { OrderId = "123", Amount = 49.99m }
);

// Publish with metadata
await _client.PublishEventAsync(
    "pubsub",
    "inventory-update",
    new InventoryUpdate { ItemId = "shoe-42", Delta = -1 },
    metadata: new Dictionary<string, string> { ["priority"] = "high" }
);
```

## Secrets

```csharp
public async Task<string> GetConnectionString()
{
    var secret = await _client.GetSecretAsync(
        "secretstore",
        "db-connection-string"
    );
    return secret["db-connection-string"];
}

// Get all secrets
var allSecrets = await _client.GetBulkSecretAsync("secretstore");
```

## Bindings

```csharp
// Invoke output binding
await _client.InvokeBindingAsync(
    "email-binding",
    "create",
    new EmailData { To = "user@example.com", Subject = "Order Confirmed", Body = "Your order is confirmed." },
    metadata: new Dictionary<string, string> { ["emailFrom"] = "noreply@example.com" }
);
```

## Summary

DaprClient provides a consistent, strongly-typed API for all Dapr building blocks in .NET. State management supports optimistic concurrency via ETags, service invocation handles serialization automatically, and pub/sub publishing is a single method call. Registering DaprClient via `AddDaprClient()` in the DI container is the recommended pattern for ASP.NET Core applications.
