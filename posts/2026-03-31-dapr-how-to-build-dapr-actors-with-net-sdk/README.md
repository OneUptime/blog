# How to Build Dapr Actors with .NET SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, .NET, Actor, C#, Microservice, Distributed System

Description: Learn how to build virtual actors using the Dapr .NET SDK, covering actor interfaces, implementations, state management, and timers.

---

Dapr's actor model provides a simple, single-threaded programming abstraction for managing distributed state and behavior. With the .NET SDK, you can implement actors using familiar C# interfaces and classes while Dapr handles placement, activation, and lifecycle management. This guide takes you through building a complete actor-based application with the Dapr .NET SDK.

## Project Setup

Create a new ASP.NET Core Web API project and add Dapr actor dependencies.

```bash
dotnet new web -n DaprActorDemo
cd DaprActorDemo
dotnet add package Dapr.Actors
dotnet add package Dapr.Actors.AspNetCore
```

Verify the project file includes the required packages:

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Dapr.Actors" Version="1.14.0" />
    <PackageReference Include="Dapr.Actors.AspNetCore" Version="1.14.0" />
  </ItemGroup>
</Project>
```

## Defining the Actor Interface

Actor interfaces define the contract for your actor. They must extend `IActor` and use only serializable types.

```csharp
using Dapr.Actors;

namespace DaprActorDemo;

public interface IShoppingCartActor : IActor
{
    Task AddItemAsync(string itemId, int quantity, decimal price);
    Task RemoveItemAsync(string itemId);
    Task<CartState> GetCartAsync();
    Task<decimal> GetTotalAsync();
    Task ClearCartAsync();
}

public record CartItem(string ItemId, int Quantity, decimal Price);

public class CartState
{
    public List<CartItem> Items { get; set; } = new();
    public string CustomerId { get; set; } = string.Empty;
    public DateTime LastUpdated { get; set; }
}
```

## Implementing the Actor

Implement the interface by extending `Actor` and implementing the defined methods.

```csharp
using Dapr.Actors;
using Dapr.Actors.Runtime;

namespace DaprActorDemo;

[Actor(TypeName = "ShoppingCartActor")]
public class ShoppingCartActor : Actor, IShoppingCartActor
{
    private const string CartStateKey = "cart-state";

    public ShoppingCartActor(ActorHost host) : base(host)
    {
    }

    protected override async Task OnActivateAsync()
    {
        Logger.LogInformation("Actor {ActorId} activated", Id.GetId());

        // Initialize state if this is a new actor
        var exists = await StateManager.ContainsStateAsync(CartStateKey);
        if (!exists)
        {
            var initialState = new CartState
            {
                CustomerId = Id.GetId(),
                Items = new List<CartItem>(),
                LastUpdated = DateTime.UtcNow
            };
            await StateManager.SetStateAsync(CartStateKey, initialState);
        }
    }

    public async Task AddItemAsync(string itemId, int quantity, decimal price)
    {
        var cart = await StateManager.GetStateAsync<CartState>(CartStateKey);

        var existingItem = cart.Items.FirstOrDefault(i => i.ItemId == itemId);
        if (existingItem != null)
        {
            cart.Items.Remove(existingItem);
            cart.Items.Add(existingItem with { Quantity = existingItem.Quantity + quantity });
        }
        else
        {
            cart.Items.Add(new CartItem(itemId, quantity, price));
        }

        cart.LastUpdated = DateTime.UtcNow;
        await StateManager.SetStateAsync(CartStateKey, cart);
        Logger.LogInformation("Added item {ItemId} to cart {CartId}", itemId, Id.GetId());
    }

    public async Task RemoveItemAsync(string itemId)
    {
        var cart = await StateManager.GetStateAsync<CartState>(CartStateKey);
        cart.Items.RemoveAll(i => i.ItemId == itemId);
        cart.LastUpdated = DateTime.UtcNow;
        await StateManager.SetStateAsync(CartStateKey, cart);
    }

    public async Task<CartState> GetCartAsync()
    {
        return await StateManager.GetStateAsync<CartState>(CartStateKey);
    }

    public async Task<decimal> GetTotalAsync()
    {
        var cart = await StateManager.GetStateAsync<CartState>(CartStateKey);
        return cart.Items.Sum(i => i.Quantity * i.Price);
    }

    public async Task ClearCartAsync()
    {
        var cart = await StateManager.GetStateAsync<CartState>(CartStateKey);
        cart.Items.Clear();
        cart.LastUpdated = DateTime.UtcNow;
        await StateManager.SetStateAsync(CartStateKey, cart);
    }
}
```

## Registering Actors and Configuring the Host

Register actors in `Program.cs` and configure the required actor endpoints.

```csharp
using DaprActorDemo;

var builder = WebApplication.CreateBuilder(args);

// Register Dapr actors
builder.Services.AddActors(options =>
{
    options.Actors.RegisterActor<ShoppingCartActor>();

    // Configure actor runtime settings
    options.ActorIdleTimeout = TimeSpan.FromMinutes(60);
    options.ActorScanInterval = TimeSpan.FromSeconds(30);
    options.DrainOngoingCallTimeout = TimeSpan.FromSeconds(60);
    options.DrainRebalancedActors = true;
});

var app = builder.Build();

app.UseRouting();

// Map actor endpoints - required for Dapr actor runtime
app.MapActorsHandlers();

// Add a simple API endpoint for testing
app.MapPost("/cart/{customerId}/add", async (
    string customerId,
    AddItemRequest request,
    IActorProxyFactory actorProxyFactory) =>
{
    var proxy = actorProxyFactory.CreateActorProxy<IShoppingCartActor>(
        new ActorId(customerId),
        "ShoppingCartActor"
    );

    await proxy.AddItemAsync(request.ItemId, request.Quantity, request.Price);
    return Results.Ok(new { message = "Item added" });
});

app.MapGet("/cart/{customerId}", async (
    string customerId,
    IActorProxyFactory actorProxyFactory) =>
{
    var proxy = actorProxyFactory.CreateActorProxy<IShoppingCartActor>(
        new ActorId(customerId),
        "ShoppingCartActor"
    );

    var cart = await proxy.GetCartAsync();
    var total = await proxy.GetTotalAsync();
    return Results.Ok(new { cart, total });
});

app.Run();

public record AddItemRequest(string ItemId, int Quantity, decimal Price);
```

Run the application:

```bash
dapr run --app-id shopping-cart --app-port 5000 --dapr-http-port 3500 -- dotnet run
```

## Adding Timers and Reminders

Actors support two types of scheduled callbacks: timers (not persisted across deactivation) and reminders (persisted and will fire even after actor reactivation).

```csharp
[Actor(TypeName = "SessionActor")]
public class SessionActor : Actor, ISessionActor, IRemindable
{
    public SessionActor(ActorHost host) : base(host) { }

    protected override async Task OnActivateAsync()
    {
        // Register a timer that fires every 5 minutes while the actor is active
        await RegisterTimerAsync(
            "heartbeat-timer",
            nameof(HeartbeatTimerCallback),
            null,
            dueTime: TimeSpan.FromMinutes(1),
            period: TimeSpan.FromMinutes(5)
        );

        // Register a persistent reminder that fires after 30 minutes
        await RegisterReminderAsync(
            "session-expiry",
            null,
            dueTime: TimeSpan.FromMinutes(30),
            period: TimeSpan.FromMilliseconds(-1) // fire once only
        );
    }

    private async Task HeartbeatTimerCallback(byte[] state)
    {
        Logger.LogInformation("Heartbeat timer fired for actor {ActorId}", Id.GetId());
        await StateManager.SetStateAsync("last-heartbeat", DateTime.UtcNow);
    }

    public async Task ReceiveReminderAsync(
        string reminderName,
        byte[] state,
        TimeSpan dueTime,
        TimeSpan period)
    {
        if (reminderName == "session-expiry")
        {
            Logger.LogInformation("Session expired for actor {ActorId}", Id.GetId());
            await StateManager.SetStateAsync("status", "expired");

            // Unregister timer since session is done
            await UnregisterTimerAsync("heartbeat-timer");
        }
    }
}

public interface ISessionActor : IActor
{
}
```

## Calling Actors from Other Services

Use the `ActorProxy` to invoke actors from any .NET service, including other actors.

```csharp
using Dapr.Actors;
using Dapr.Actors.Client;

public class OrderService
{
    private readonly IActorProxyFactory _actorProxyFactory;

    public OrderService(IActorProxyFactory actorProxyFactory)
    {
        _actorProxyFactory = actorProxyFactory;
    }

    public async Task<CheckoutResult> CheckoutAsync(string customerId)
    {
        // Create a proxy to call the shopping cart actor
        var cartProxy = _actorProxyFactory.CreateActorProxy<IShoppingCartActor>(
            new ActorId(customerId),
            "ShoppingCartActor"
        );

        // Get the current cart state
        var cart = await cartProxy.GetCartAsync();
        var total = await cartProxy.GetTotalAsync();

        if (!cart.Items.Any())
        {
            return new CheckoutResult(false, "Cart is empty");
        }

        // Process the order (simplified)
        Console.WriteLine($"Processing order for customer {customerId}, total: {total:C}");

        // Clear the cart after successful checkout
        await cartProxy.ClearCartAsync();

        return new CheckoutResult(true, $"Order placed for {total:C}");
    }
}

public record CheckoutResult(bool Success, string Message);
```

## Summary

The Dapr .NET SDK makes building virtual actors straightforward with its interface-based design. You learned how to define actor interfaces, implement actors with state management using `StateManager`, register and host actors in an ASP.NET Core application, schedule work with timers and reminders, and call actors from other services using the `ActorProxy`. Dapr handles all the complexity of actor placement, single-threaded access guarantees, and state persistence, so your C# code can focus purely on domain logic.
