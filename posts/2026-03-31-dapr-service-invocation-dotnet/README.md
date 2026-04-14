# How to Use Dapr Service Invocation with .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, .NET, Service Invocation, C#, Microservice

Description: Invoke Dapr services from .NET using DaprClient and HttpClient with typed requests, error handling, and the Dapr-aware HttpClientFactory pattern.

---

## Overview

Dapr service invocation in .NET supports two patterns: using `DaprClient.InvokeMethodAsync` for typed calls, and using `DaprClient.CreateInvokeHttpClient` for HttpClient-style requests. Both handle service discovery and mTLS automatically.

> **Note:** The `InvokeMethodAsync` and `InvokeMethodWithResponseAsync` methods are marked as obsolete in the current Dapr .NET SDK. The recommended approach is to use a native HTTP client with `InvocationHandler` or `CreateInvokeHttpClient` for service invocation. The examples below still work but will produce compiler warnings.

## Pattern 1: DaprClient.InvokeMethodAsync

```csharp
using Dapr.Client;

public class ShoppingCartService
{
    private readonly DaprClient _dapr;

    public ShoppingCartService(DaprClient dapr) => _dapr = dapr;

    // GET with return type
    public async Task<Product> GetProduct(string productId)
    {
        return await _dapr.InvokeMethodAsync<Product>(
            HttpMethod.Get,
            "catalog-service",     // target app-id
            $"products/{productId}"
        );
    }

    // POST with request and response types
    public async Task<CartResult> AddToCart(string userId, AddItemRequest request)
    {
        return await _dapr.InvokeMethodAsync<AddItemRequest, CartResult>(
            HttpMethod.Post,
            "cart-service",
            $"carts/{userId}/items",
            request
        );
    }

    // PUT
    public async Task UpdateQuantity(string cartId, UpdateRequest request)
    {
        await _dapr.InvokeMethodAsync(
            HttpMethod.Put,
            "cart-service",
            $"carts/{cartId}",
            request
        );
    }

    // DELETE
    public async Task RemoveItem(string cartId, string itemId)
    {
        await _dapr.InvokeMethodAsync(
            HttpMethod.Delete,
            "cart-service",
            $"carts/{cartId}/items/{itemId}"
        );
    }
}
```

## Pattern 2: Dapr HttpClient Factory

```csharp
// Register in Program.cs
builder.Services.AddHttpClient("catalog", client =>
{
    client.BaseAddress = new Uri("http://catalog-service");
}).AddHttpMessageHandler(() => new InvocationHandler());

// Or use DaprClient helper
var httpClient = DaprClient.CreateInvokeHttpClient(
    appId: "catalog-service",
    daprEndpoint: "http://localhost:3500"
);

// Use like a normal HttpClient
var product = await httpClient.GetFromJsonAsync<Product>("/products/123");
```

## Error Handling

```csharp
using Dapr.Client;
using Grpc.Core;

try
{
    var result = await _dapr.InvokeMethodAsync<OrderResult>(
        HttpMethod.Post,
        "payment-service",
        "process"
    );
}
catch (InvocationException ex) when (ex.Response.StatusCode == HttpStatusCode.NotFound)
{
    Console.WriteLine("Service or method not found");
}
catch (RpcException ex) when (ex.StatusCode == StatusCode.Unavailable)
{
    Console.WriteLine("Service unavailable - check if app is running");
}
```

## Passing Headers

```csharp
var request = _dapr.CreateInvokeMethodRequest(
    HttpMethod.Get,
    "inventory-service",
    "stock/item-1"
);
request.Headers.Add("X-Correlation-ID", correlationId);

using var response = await _dapr.InvokeMethodWithResponseAsync(request);
response.EnsureSuccessStatusCode();
var stock = await response.Content.ReadFromJsonAsync<StockInfo>();
```

## Registering with DI

```csharp
// Program.cs
builder.Services.AddSingleton<ShoppingCartService>();
builder.Services.AddDaprClient();
```

```csharp
// Usage in controller
[HttpPost("checkout")]
public async Task<IActionResult> Checkout(
    [FromBody] CheckoutRequest req,
    [FromServices] ShoppingCartService cartService)
{
    var result = await cartService.AddToCart(req.UserId, req.Items);
    return Ok(result);
}
```

## Summary

Dapr service invocation in .NET offers two ergonomic patterns: the typed `InvokeMethodAsync` API for straightforward calls, and the HttpClient factory for teams preferring familiar HTTP semantics. Both patterns eliminate the need for service discovery or hardcoded URLs, and the DaprClient handles mTLS and tracing automatically. For retries and circuit breaking, configure Dapr [resiliency policies](https://docs.dapr.io/operations/resiliency/). Since `InvokeMethodAsync` is now obsolete, prefer the HttpClient factory pattern with `CreateInvokeHttpClient` or `InvocationHandler` for new projects. Always inject `DaprClient` via DI rather than creating instances manually.
