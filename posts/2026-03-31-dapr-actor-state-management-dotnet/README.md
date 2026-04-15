# How to Implement Actor State Management in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, .NET, State Management, C#

Description: Learn how to manage Dapr actor state in .NET using the .NET SDK, including reading, writing, and deleting state with transactions and type-safe state keys.

---

## Actor State in Dapr

Dapr actors persist state through the actor state manager, which serializes and stores data in the configured state store. In .NET, the `IActorStateManager` interface provides methods for getting, setting, deleting, and saving state. State is automatically scoped to the actor instance - two actors of the same type with different IDs have completely separate state.

## Setting Up the Project

```bash
dotnet new web -n ActorStateDemo
cd ActorStateDemo
dotnet add package Dapr.Actors.AspNetCore
```

## Defining the Actor Interface

```csharp
using Dapr.Actors;

public interface IInventoryActor : IActor
{
    Task<int> GetStock(string productId);
    Task<bool> Reserve(string productId, int quantity);
    Task Replenish(string productId, int quantity);
    Task<Dictionary<string, int>> GetAllStock();
}
```

## Implementing State Management

```csharp
using Dapr.Actors.Runtime;

[Actor(TypeName = "InventoryActor")]
public class InventoryActor : Actor, IInventoryActor
{
    private const string StockKey = "stock";

    public InventoryActor(ActorHost host) : base(host) { }

    protected override async Task OnActivateAsync()
    {
        // Initialize default state if not present
        var exists = await StateManager.ContainsStateAsync(StockKey);
        if (!exists)
        {
            await StateManager.SetStateAsync(StockKey, new Dictionary<string, int>());
        }
    }

    public async Task<int> GetStock(string productId)
    {
        var stock = await StateManager.GetStateAsync<Dictionary<string, int>>(StockKey);
        return stock.TryGetValue(productId, out int qty) ? qty : 0;
    }

    public async Task<bool> Reserve(string productId, int quantity)
    {
        var stock = await StateManager.GetStateAsync<Dictionary<string, int>>(StockKey);

        if (!stock.TryGetValue(productId, out int available) || available < quantity)
            return false;

        stock[productId] = available - quantity;
        await StateManager.SetStateAsync(StockKey, stock);
        await StateManager.SaveStateAsync();
        return true;
    }

    public async Task Replenish(string productId, int quantity)
    {
        var stock = await StateManager.GetStateAsync<Dictionary<string, int>>(StockKey);
        stock[productId] = stock.TryGetValue(productId, out int current) ? current + quantity : quantity;
        await StateManager.SetStateAsync(StockKey, stock);
        await StateManager.SaveStateAsync();
    }

    public async Task<Dictionary<string, int>> GetAllStock()
    {
        return await StateManager.GetStateAsync<Dictionary<string, int>>(StockKey);
    }
}
```

## Using Multiple State Keys

For complex actors, use multiple independent state keys rather than a single large object:

```csharp
[Actor(TypeName = "UserProfileActor")]
public class UserProfileActor : Actor, IUserProfileActor
{
    public async Task UpdateProfile(UserProfile profile)
    {
        await StateManager.SetStateAsync("profile", profile);
        await StateManager.SaveStateAsync();
    }

    public async Task UpdatePreferences(UserPreferences prefs)
    {
        await StateManager.SetStateAsync("preferences", prefs);
        await StateManager.SaveStateAsync();
    }

    public async Task<(UserProfile, UserPreferences)> GetAll()
    {
        var profile = await StateManager.GetOrAddStateAsync("profile", new UserProfile());
        var prefs = await StateManager.GetOrAddStateAsync("preferences", new UserPreferences());
        return (profile, prefs);
    }

    public async Task DeleteAccount()
    {
        await StateManager.TryRemoveStateAsync("profile");
        await StateManager.TryRemoveStateAsync("preferences");
        await StateManager.SaveStateAsync();
    }
}
```

## Registering in Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddActors(options =>
{
    options.Actors.RegisterActor<InventoryActor>();
    options.Actors.RegisterActor<UserProfileActor>();
    options.ActorIdleTimeout = TimeSpan.FromMinutes(30);
});

var app = builder.Build();
app.MapActorsHandlers();
app.Run();
```

## Key State Manager Methods

| Method | Description |
|---|---|
| `SetStateAsync` | Set or overwrite a state value |
| `GetStateAsync` | Retrieve state, throws if not found |
| `GetOrAddStateAsync` | Get state or create with default |
| `TryGetStateAsync` | Returns `ConditionalValue<T>` with `HasValue` and `Value` properties |
| `TryRemoveStateAsync` | Remove state if it exists |
| `SaveStateAsync` | Flush pending state changes |

## Summary

Dapr actor state management in .NET is handled through the `StateManager` property on `Actor`. Use typed state keys to store serialized objects, call `SaveStateAsync()` after mutations to persist changes, and use `GetOrAddStateAsync()` to safely initialize state on first access. Breaking state into multiple focused keys makes actors easier to maintain and test.
