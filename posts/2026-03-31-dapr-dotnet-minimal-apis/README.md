# How to Use Dapr with .NET Minimal APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, DotNet, Minimal API, Microservice, API, Integration

Description: Build lightweight Dapr-powered microservices using .NET Minimal APIs for pub/sub, state management, and service invocation with minimal boilerplate.

---

## Overview

.NET Minimal APIs offer a concise way to define HTTP endpoints without the overhead of full MVC controllers. Combined with Dapr, they are ideal for building focused microservices that leverage distributed-systems primitives while keeping code lean.

## Installing Packages

```bash
dotnet add package Dapr.AspNetCore
dotnet add package Dapr.Client
```

## Bootstrapping Dapr in Minimal API

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprClient();

var app = builder.Build();
app.UseCloudEvents();
app.MapSubscribeHandler();
```

## Service Invocation

Call another microservice by its Dapr app-id without hardcoding URLs:

```csharp
app.MapGet("/products/{id}", async (string id, DaprClient dapr) =>
{
    var product = await dapr.InvokeMethodAsync<Product>(
        HttpMethod.Get, "catalog-service", $"products/{id}");
    return product is not null ? Results.Ok(product) : Results.NotFound();
});
```

## State Management

Save and retrieve state using the Dapr state store building block:

```csharp
app.MapPost("/cart/{userId}", async (string userId, CartItem item, DaprClient dapr) =>
{
    var cart = await dapr.GetStateAsync<List<CartItem>>("statestore", userId)
               ?? new List<CartItem>();
    cart.Add(item);
    await dapr.SaveStateAsync("statestore", userId, cart);
    return Results.Ok(cart);
});

app.MapGet("/cart/{userId}", async (string userId, DaprClient dapr) =>
{
    var cart = await dapr.GetStateAsync<List<CartItem>>("statestore", userId);
    return Results.Ok(cart ?? new List<CartItem>());
});
```

## Pub/Sub with Topic Attribute

Subscribe to a Dapr topic using the `[Topic]` attribute on a minimal API route:

```csharp
app.MapPost("/order-placed", [Topic("pubsub", "order-placed")] async (
    Order order, DaprClient dapr) =>
{
    Console.WriteLine($"Processing order {order.Id}");
    await dapr.SaveStateAsync("statestore", $"order-{order.Id}", order);
    return Results.Ok();
});
```

Publish an event from another route:

```csharp
app.MapPost("/checkout", async (Order order, DaprClient dapr) =>
{
    await dapr.PublishEventAsync("pubsub", "order-placed", order);
    return Results.Accepted();
});
```

## Secrets API

Retrieve secrets from a Dapr secret store rather than environment variables:

```csharp
app.MapGet("/config", async (DaprClient dapr) =>
{
    var secret = await dapr.GetSecretAsync("my-secret-store", "db-password");
    return Results.Ok(new { HasSecret = secret.ContainsKey("db-password") });
});
```

## Running the Service

```bash
dapr run --app-id cart-service --app-port 5050 --resources-path ./components \
  -- dotnet run --urls http://localhost:5050
```

## Summary

Dapr integrates effortlessly with .NET Minimal APIs by extending `IServiceCollection` and providing route-level `[Topic]` attributes. This combination delivers microservices that are both concise and production-ready, with all Dapr building blocks available through the injected `DaprClient` without any controller infrastructure.
