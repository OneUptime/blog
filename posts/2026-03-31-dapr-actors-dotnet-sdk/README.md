# How to Use Dapr Actors with .NET SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, .NET, Actor, C#, Virtual Actor

Description: Build stateful Dapr virtual actors in .NET using the Actor SDK, including actor interfaces, implementations, timers, reminders, and client invocation.

---

## Overview

Dapr actors implement the virtual actor pattern, providing single-threaded stateful objects that are automatically activated on demand. The .NET Actor SDK provides strongly-typed interfaces and a clean programming model.

## Setup

```bash
dotnet add package Dapr.Actors
dotnet add package Dapr.Actors.AspNetCore
```

## Step 1: Define the Actor Interface

```csharp
using Dapr.Actors;

public interface IOrderActor : IActor
{
    Task<OrderState> GetStateAsync();
    Task PlaceOrderAsync(OrderRequest request);
    Task UpdateStatusAsync(string status);
    Task CancelOrderAsync(string reason);
}
```

## Step 2: Implement the Actor

```csharp
[Actor(TypeName = "OrderActor")]
public class OrderActor : Actor, IOrderActor, IRemindable
{
    public OrderActor(ActorHost host) : base(host) { }

    protected override async Task OnActivateAsync()
    {
        Console.WriteLine($"Actor activated: {this.Id}");
        var existing = await StateManager.TryGetStateAsync<OrderState>("order");
        if (!existing.HasValue)
        {
            await StateManager.SetStateAsync("order", new OrderState { Status = "new" });
        }
    }

    public async Task<OrderState> GetStateAsync()
    {
        return await StateManager.GetStateAsync<OrderState>("order");
    }

    public async Task PlaceOrderAsync(OrderRequest request)
    {
        var state = new OrderState
        {
            OrderId = this.Id.GetId(),
            CustomerId = request.CustomerId,
            Items = request.Items,
            Total = request.Total,
            Status = "placed",
            PlacedAt = DateTime.UtcNow
        };
        await StateManager.SetStateAsync("order", state);
        await RegisterReminderAsync("payment-reminder", null, TimeSpan.FromMinutes(15), TimeSpan.FromDays(1));
    }

    public async Task UpdateStatusAsync(string status)
    {
        var order = await StateManager.GetStateAsync<OrderState>("order");
        order.Status = status;
        order.UpdatedAt = DateTime.UtcNow;
        await StateManager.SetStateAsync("order", order);
    }

    public async Task CancelOrderAsync(string reason)
    {
        await UpdateStatusAsync("cancelled");
        await UnregisterReminderAsync("payment-reminder");
    }

    public async Task ReceiveReminderAsync(string reminderName, byte[] state, TimeSpan dueTime, TimeSpan period)
    {
        if (reminderName == "payment-reminder")
        {
            Console.WriteLine($"Payment reminder fired for order {this.Id}");
        }
    }
}
```

## Step 3: Register Actors in Program.cs

```csharp
// Program.cs
builder.Services.AddActors(options =>
{
    options.Actors.RegisterActor<OrderActor>();
    options.ActorIdleTimeout = TimeSpan.FromMinutes(30);
    options.DrainOngoingCallTimeout = TimeSpan.FromSeconds(10);
});

var app = builder.Build();
app.MapActorsHandlers();  // Required
app.Run();
```

## Step 4: Invoke Actors from a Client

```csharp
using Dapr.Actors;
using Dapr.Actors.Client;

var proxy = ActorProxy.Create<IOrderActor>(
    new ActorId("order-12345"),
    "OrderActor"
);

await proxy.PlaceOrderAsync(new OrderRequest
{
    CustomerId = "cust-1",
    Items = new[] { new OrderItem { ProductId = "p1", Qty = 2 } },
    Total = 29.99m
});

var state = await proxy.GetStateAsync();
Console.WriteLine($"Order status: {state.Status}");
```

## Summary

Dapr actors in .NET use strongly-typed interfaces and the `Actor` base class to build reliable stateful objects. The `StateManager` property provides transactional state persistence, while reminders enable durable scheduled callbacks that survive restarts. Registering actors via `AddActors()` and calling `MapActorsHandlers()` wires up the Dapr runtime integration in a few lines of code.
