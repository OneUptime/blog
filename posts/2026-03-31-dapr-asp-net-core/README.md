# How to Use Dapr with ASP.NET Core

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Aspnet, DotNet, Microservice, API, Integration

Description: A practical guide to integrating Dapr building blocks into ASP.NET Core applications using the official .NET SDK and middleware extensions.

---

## Overview

Dapr integrates cleanly with ASP.NET Core through a set of middleware extensions and helper methods provided by the `Dapr.AspNetCore` package. This lets you subscribe to topics, invoke services, and manage state directly from your controllers and minimal API endpoints.

## Setup

Install the required package:

```bash
dotnet add package Dapr.AspNetCore
```

Register Dapr in `Program.cs`:

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers().AddDapr();

var app = builder.Build();
app.UseCloudEvents();
app.MapControllers();
app.MapSubscribeHandler();
app.Run();
```

## Service Invocation with HttpClient

Inject the Dapr-aware `HttpClient` to call other services by their Dapr app-id:

```csharp
using Dapr.Client;

[ApiController]
[Route("orders")]
public class OrderController : ControllerBase
{
    private readonly DaprClient _dapr;
    public OrderController(DaprClient dapr) => _dapr = dapr;

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrder(string id)
    {
        var order = await _dapr.InvokeMethodAsync<Order>(
            HttpMethod.Get, "order-service", $"orders/{id}");
        return Ok(order);
    }
}
```

## Pub/Sub Subscriptions

Decorate a controller action with `[Topic]` to subscribe to a Dapr pub/sub topic:

```csharp
[HttpPost("checkout")]
[Topic("pubsub", "orders")]
public async Task<IActionResult> OnOrder(Order order)
{
    await _dapr.SaveStateAsync("statestore", order.Id, order);
    return Ok();
}
```

## State Management in a Controller

```csharp
[HttpPut("{id}")]
public async Task<IActionResult> UpdateOrder(string id, Order order)
{
    await _dapr.SaveStateAsync("statestore", id, order);
    return NoContent();
}

[HttpDelete("{id}")]
public async Task<IActionResult> DeleteOrder(string id)
{
    await _dapr.DeleteStateAsync("statestore", id);
    return NoContent();
}
```

## Minimal API Alternative

If you prefer minimal APIs instead of controllers:

```csharp
app.MapPost("/events", [Topic("pubsub", "inventory")] async (
    InventoryEvent evt, DaprClient dapr) =>
{
    await dapr.SaveStateAsync("statestore", evt.ProductId, evt);
    return Results.Ok();
});
```

## Running the Application

```bash
dapr run --app-id order-api --app-port 5001 --resources-path ./components \
  -- dotnet run --urls http://localhost:5001
```

## Summary

Integrating Dapr with ASP.NET Core requires only a few lines of setup in `Program.cs`. The `AddDapr()` extension registers Dapr integration for controllers and the `DaprClient` in dependency injection, `UseCloudEvents()` middleware handles CloudEvents unwrapping, and `MapSubscribeHandler()` exposes the subscription endpoint that the Dapr sidecar queries at startup. This approach keeps your controller code clean while gaining full access to all Dapr building blocks through the injected `DaprClient`.
