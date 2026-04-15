# How to Implement Batch Aggregation with Dapr Actors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Batch, Aggregation, Performance

Description: Learn how to implement batch aggregation using Dapr actors to collect individual events into micro-batches and process them together for improved throughput.

---

## What Is Batch Aggregation?

Batch aggregation collects many small operations and processes them together as a single unit. This reduces per-operation overhead - fewer database round trips, fewer API calls, better throughput. Dapr actor reminders schedule the batch flush at regular intervals.

## Batch Aggregator Actor Interface

```typescript
interface IBatchAggregatorActor {
  addItem(item: any): Promise<void>;
  flush(): Promise<BatchResult>;
  getCount(): Promise<number>;
}
```

## Batch Aggregator Actor Implementation

```csharp
[Actor(TypeName = "BatchAggregator")]
public class BatchAggregatorActor : Actor, IBatchAggregatorActor, IRemindable
{
    private const string BatchKey = "batch";
    private const string FlushReminder = "flush-timer";
    private readonly int MaxBatchSize = 100;
    private readonly TimeSpan FlushInterval = TimeSpan.FromSeconds(5);

    public BatchAggregatorActor(ActorHost host) : base(host) { }

    public async Task AddItemAsync(object item)
    {
        var batch = await StateManager.GetOrAddStateAsync(BatchKey, new List<object>());
        batch.Add(item);
        await StateManager.SetStateAsync(BatchKey, batch);

        // Register flush reminder on first item
        if (batch.Count == 1)
        {
            await RegisterReminderAsync(FlushReminder, null, FlushInterval, TimeSpan.FromMilliseconds(-1));
        }

        // Flush immediately if batch is full
        if (batch.Count >= MaxBatchSize)
        {
            await FlushAsync();
        }
    }

    public async Task<BatchResult> FlushAsync()
    {
        var batch = await StateManager.TryGetStateAsync<List<object>>(BatchKey);
        if (!batch.HasValue || !batch.Value.Any())
        {
            return new BatchResult { Count = 0, ProcessedAt = DateTime.UtcNow };
        }

        var items = batch.Value;
        await StateManager.RemoveStateAsync(BatchKey);

        // Cancel the scheduled reminder since we're flushing now
        await UnregisterReminderAsync(FlushReminder);

        // Process the batch
        await ProcessBatchAsync(items);
        return new BatchResult { Count = items.Count, ProcessedAt = DateTime.UtcNow };
    }

    private async Task ProcessBatchAsync(List<object> items)
    {
        // Bulk insert to database
        await database.BulkInsertAsync("events", items);
    }

    public async Task ReceiveReminderAsync(string reminderName, byte[] state, TimeSpan dueTime, TimeSpan period)
    {
        if (reminderName == FlushReminder)
        {
            await FlushAsync();
        }
    }

    public async Task<int> GetCountAsync()
    {
        var batch = await StateManager.TryGetStateAsync<List<object>>(BatchKey);
        return batch.HasValue ? batch.Value.Count : 0;
    }
}
```

## Producing Events to a Batch Aggregator

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

// Route events to a batch actor by partition key
async function trackEvent(userId, event) {
  // Use a shard of aggregators to distribute load
  const shard = parseInt(userId, 10) % 10;
  const actorId = `analytics-batch-${shard}`;

  await client.actor.invoke('BatchAggregator', actorId, 'AddItemAsync', {
    userId,
    event: event.name,
    properties: event.properties,
    timestamp: Date.now()
  });
}

// Called on every page view, click, etc.
app.post('/track', async (req, res) => {
  await trackEvent(req.user.id, req.body);
  res.json({ queued: true });
});
```

## Manual Flush for Graceful Shutdown

```javascript
async function gracefulShutdown() {
  console.log('Flushing batch aggregators before shutdown...');

  const shards = Array.from({ length: 10 }, (_, i) => `analytics-batch-${i}`);
  await Promise.all(
    shards.map(actorId => client.actor.invoke('BatchAggregator', actorId, 'FlushAsync'))
  );

  console.log('All batches flushed');
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
```

## Summary

Dapr actor reminders drive automatic batch flushing every N seconds while a size cap triggers immediate flushes for high-volume periods. Sharding the aggregator actors across multiple IDs distributes load, and a graceful shutdown hook ensures no events are lost when pods restart.
