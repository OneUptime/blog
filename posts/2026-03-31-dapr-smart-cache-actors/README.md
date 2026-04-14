# How to Implement Smart Cache with Dapr Actors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Cache, Performance, State Management

Description: Learn how to implement a smart cache using Dapr actors where each actor manages its own cached entry with TTL, refresh logic, and access tracking.

---

## What Is a Smart Cache?

A smart cache is more than a key-value store. Each entry is an actor that knows how to refresh itself when stale, track its hit rate, and schedule its own expiry. This shifts cache management intelligence from the client into the cache entries themselves.

## Cache Actor Interface

```csharp
public class SetCacheRequest
{
    public CacheValue Value { get; set; }
    public int TtlSeconds { get; set; }
}

public interface ICacheEntryActor : IActor
{
    Task<CacheValue> GetAsync();
    Task SetAsync(SetCacheRequest request);
    Task InvalidateAsync();
    Task<CacheStats> GetStatsAsync();
}
```

## Cache Actor Implementation

```csharp
[Actor(TypeName = "CacheEntry")]
public class CacheEntryActor : Actor, ICacheEntryActor, IRemindable
{
    private const string ValueKey = "value";
    private const string StatsKey = "stats";

    public CacheEntryActor(ActorHost host) : base(host) { }

    public async Task<CacheValue> GetAsync()
    {
        var entry = await StateManager.TryGetStateAsync<CacheEntry>(ValueKey);
        var stats = await StateManager.GetOrAddStateAsync(StatsKey, new CacheStats());

        if (!entry.HasValue || entry.Value.ExpiresAt < DateTime.UtcNow)
        {
            stats.Misses++;
            await StateManager.SetStateAsync(StatsKey, stats);
            return null;
        }

        stats.Hits++;
        stats.LastAccessed = DateTime.UtcNow;
        await StateManager.SetStateAsync(StatsKey, stats);
        return entry.Value.Data;
    }

    public async Task SetAsync(SetCacheRequest request)
    {
        var entry = new CacheEntry
        {
            Data = request.Value,
            ExpiresAt = DateTime.UtcNow.AddSeconds(request.TtlSeconds),
            CachedAt = DateTime.UtcNow
        };
        await StateManager.SetStateAsync(ValueKey, entry);

        // Schedule eviction at TTL expiry
        await RegisterReminderAsync("evict", null,
            TimeSpan.FromSeconds(request.TtlSeconds),
            TimeSpan.FromMilliseconds(-1));  // one-shot
    }

    public async Task InvalidateAsync()
    {
        await StateManager.RemoveStateAsync(ValueKey);
        await UnregisterReminderAsync("evict");
    }

    public async Task<CacheStats> GetStatsAsync()
    {
        return await StateManager.GetOrAddStateAsync(StatsKey, new CacheStats());
    }

    public async Task ReceiveReminderAsync(string reminderName, ...)
    {
        if (reminderName == "evict")
        {
            await StateManager.RemoveStateAsync(ValueKey);
        }
    }
}
```

## Using the Cache Actor from a Service

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

async function getCached(key, fetcher, ttlSeconds = 300) {
  const cached = await client.actor.invoke('CacheEntry', key, 'GetAsync');

  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch the real value
  const fresh = await fetcher();

  await client.actor.invoke('CacheEntry', key, 'SetAsync', {
    value: fresh,
    ttlSeconds
  });

  return fresh;
}

// Usage
app.get('/products/:id', async (req, res) => {
  const product = await getCached(
    `product:${req.params.id}`,
    () => db.getProduct(req.params.id),
    600
  );
  res.json(product);
});
```

## Monitoring Cache Performance

```javascript
async function getCacheStats(key) {
  return client.actor.invoke('CacheEntry', key, 'GetStatsAsync');
}

// Periodically report cache hit rates
setInterval(async () => {
  const hotKeys = ['product:1001', 'product:1002', 'category:electronics'];
  for (const key of hotKeys) {
    const stats = await getCacheStats(key);
    metrics.recordGauge('cache_hit_rate', stats.hits / (stats.hits + stats.misses), { key });
  }
}, 60_000);
```

## Summary

Dapr actors implement a smart cache where each entry is an autonomous entity with self-managed TTL, eviction reminders, and built-in access statistics. The cache-aside pattern built on top of this gives you per-key TTL control and hit rate observability without any external cache management infrastructure.
