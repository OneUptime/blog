# How to Implement Observer Pattern with Dapr Actors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Observer Pattern, Notification, Event

Description: Learn how to implement the observer pattern using Dapr actors where a subject actor notifies all registered observer actors when its state changes.

---

## What Is the Observer Pattern with Actors?

The observer pattern lets multiple observers subscribe to a subject and receive notifications when the subject's state changes. With Dapr actors, the subject is an actor that holds a list of observer actor IDs and notifies them via actor invocation when something changes.

## Subject Actor Interface

```typescript
interface IStockTickerActor {
  subscribe(request: { observerActorType: string; observerActorId: string }): Promise<void>;
  unsubscribe(observerActorId: string): Promise<void>;
  updatePrice(newPrice: number): Promise<void>;
  getCurrentPrice(): Promise<number>;
}
```

## Subject Actor Implementation

```csharp
[Actor(TypeName = "StockTicker")]
public class StockTickerActor : Actor, IStockTickerActor
{
    private const string PriceKey = "price";
    private const string ObserversKey = "observers";

    public StockTickerActor(ActorHost host) : base(host) { }

    public async Task SubscribeAsync(SubscribeRequest request)
    {
        var observers = await StateManager.GetOrAddStateAsync<List<ObserverRef>>(
            ObserversKey, new List<ObserverRef>());

        if (!observers.Any(o => o.ActorId == request.ObserverActorId))
        {
            observers.Add(new ObserverRef { ActorType = request.ObserverActorType, ActorId = request.ObserverActorId });
            await StateManager.SetStateAsync(ObserversKey, observers);
        }
    }

    public async Task UnsubscribeAsync(string observerActorId)
    {
        var observers = await StateManager.GetOrAddStateAsync<List<ObserverRef>>(
            ObserversKey, new List<ObserverRef>());
        observers.RemoveAll(o => o.ActorId == observerActorId);
        await StateManager.SetStateAsync(ObserversKey, observers);
    }

    public async Task UpdatePriceAsync(decimal newPrice)
    {
        var oldPrice = await StateManager.GetOrAddStateAsync(PriceKey, 0m);
        await StateManager.SetStateAsync(PriceKey, newPrice);

        if (oldPrice != newPrice)
        {
            await NotifyObserversAsync(new PriceUpdate
            {
                Symbol = this.Id.GetId(),
                OldPrice = oldPrice,
                NewPrice = newPrice,
                ChangedAt = DateTime.UtcNow
            });
        }
    }

    private async Task NotifyObserversAsync(PriceUpdate update)
    {
        var observers = await StateManager.GetOrAddStateAsync<List<ObserverRef>>(
            ObserversKey, new List<ObserverRef>());

        var notifyTasks = observers.Select(obs =>
            ActorProxy.Create(new ActorId(obs.ActorId), obs.ActorType)
                .InvokeMethodAsync("OnPriceChangedAsync", update)
        );

        await Task.WhenAll(notifyTasks);
    }

    public async Task<decimal> GetCurrentPriceAsync()
    {
        return await StateManager.GetOrAddStateAsync(PriceKey, 0m);
    }
}
```

## Observer Actor Implementation

```csharp
[Actor(TypeName = "PortfolioWatcher")]
public class PortfolioWatcherActor : Actor, IPortfolioWatcherActor
{
    public PortfolioWatcherActor(ActorHost host) : base(host) { }

    public async Task OnPriceChangedAsync(PriceUpdate update)
    {
        Console.WriteLine($"Portfolio {Id}: {update.Symbol} changed from {update.OldPrice} to {update.NewPrice}");

        // Trigger rebalancing check if price moved more than 5%
        var changePercent = Math.Abs((update.NewPrice - update.OldPrice) / update.OldPrice * 100);
        if (changePercent > 5)
        {
            await CheckRebalanceAsync(update.Symbol, update.NewPrice);
        }
    }

    private async Task CheckRebalanceAsync(string symbol, decimal price)
    {
        // Portfolio-specific rebalancing logic
    }
}
```

## Subscribing and Publishing Price Updates

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

// Portfolio subscribes to stock ticker
await client.actor.invoke('StockTicker', 'AAPL', 'SubscribeAsync', {
  observerActorType: 'PortfolioWatcher',
  observerActorId: 'portfolio-user-123'
});

// Price feed pushes updates
async function publishPriceUpdate(symbol, price) {
  await client.actor.invoke('StockTicker', symbol, 'UpdatePriceAsync', price);
}
```

## Summary

The observer pattern with Dapr actors keeps subject-observer coupling minimal. The subject actor stores subscriber IDs and fans out notifications via actor invocation. Turn-based concurrency on the subject prevents race conditions during subscription list updates, and each observer processes notifications independently at its own pace.
