# How to Use Dependency Injection with Dapr .NET SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, DotNet, Dependency Injection, SDK, Microservice, Design Pattern

Description: Learn how to register and inject DaprClient, actor proxies, and Dapr-aware HttpClient using .NET's built-in dependency injection container.

---

## Overview

The Dapr .NET SDK is designed around the .NET dependency injection system. `DaprClient`, actor proxy factories, and typed HTTP clients all integrate with `IServiceCollection`, making it straightforward to inject Dapr capabilities anywhere in your application - controllers, services, background workers, and more.

## Registering DaprClient

Add `DaprClient` to the DI container in `Program.cs`:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprClient(clientBuilder =>
{
    clientBuilder.UseGrpcEndpoint("http://localhost:50001");
    clientBuilder.UseHttpEndpoint("http://localhost:3500");
    clientBuilder.UseJsonSerializationOptions(new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    });
});
```

## Injecting DaprClient into Services

```csharp
public class OrderRepository
{
    private readonly DaprClient _dapr;
    private const string Store = "statestore";

    public OrderRepository(DaprClient dapr) => _dapr = dapr;

    public Task<Order?> GetAsync(string id) =>
        _dapr.GetStateAsync<Order>(Store, id);

    public Task SaveAsync(Order order) =>
        _dapr.SaveStateAsync(Store, order.Id, order);
}

// Registration
builder.Services.AddScoped<OrderRepository>();
```

## Using DaprClient in a Background Service

```csharp
public class OrderProcessor : BackgroundService
{
    private readonly DaprClient _dapr;
    private readonly ILogger<OrderProcessor> _logger;

    public OrderProcessor(DaprClient dapr, ILogger<OrderProcessor> logger)
    {
        _dapr = dapr;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var pending = await _dapr.GetStateAsync<List<Order>>("statestore", "pending-orders");
            foreach (var order in pending ?? new())
            {
                _logger.LogInformation("Processing order {Id}", order.Id);
                await _dapr.PublishEventAsync("pubsub", "order-processed", order, stoppingToken);
            }
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }
}

builder.Services.AddHostedService<OrderProcessor>();
```

## Actor Proxy Factory Injection

```csharp
using Dapr.Actors.Client;

builder.Services.AddActors(options => { });

// In a controller or service
public class CartController : ControllerBase
{
    private readonly IActorProxyFactory _factory;

    public CartController(IActorProxyFactory factory) => _factory = factory;

    [HttpPost("{userId}/add")]
    public async Task<IActionResult> AddItem(string userId, CartItem item)
    {
        var actor = _factory.CreateActorProxy<ICartActor>(
            new ActorId(userId), "CartActor");
        await actor.AddItemAsync(item);
        return Ok();
    }
}
```

## Scoped vs Singleton Registration

`AddDaprClient()` registers `DaprClient` as a singleton by default, which is correct since it manages a gRPC channel internally. Register your own repositories as `Scoped` if they wrap `DaprClient` and hold per-request state.

## Summary

The Dapr .NET SDK's DI integration is a first-class citizen: `AddDaprClient()` wires up a singleton `DaprClient`, actor proxy factories are injectable, and the whole system composes naturally with ASP.NET Core middleware and background services. This makes Dapr-powered .NET services as testable and maintainable as any other well-designed .NET application.
