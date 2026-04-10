# How to Use Redis Pipelining in C#

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CSharp, Pipelining

Description: Learn how to use Redis pipelining in C# with StackExchange.Redis to batch multiple commands in one round-trip for significantly higher throughput.

---

Redis pipelining sends multiple commands without waiting for each individual response. StackExchange.Redis pipelines commands automatically through its multiplexer, but you can also create explicit batches using `CreateBatch` for more control.

## Automatic Pipelining

StackExchange.Redis automatically pipelines commands sent concurrently from different threads. If you fire multiple async commands without awaiting each one:

```csharp
IDatabase db = redis.GetDatabase();

// These are automatically pipelined - neither waits for the other
Task<bool> set1 = db.StringSetAsync("key1", "val1", TimeSpan.FromHours(1));
Task<bool> set2 = db.StringSetAsync("key2", "val2", TimeSpan.FromHours(1));
Task<RedisValue> get1 = db.StringGetAsync("key1");

await Task.WhenAll(set1, set2, get1);
Console.WriteLine(await get1); // val1
```

## Explicit Batch

Use `CreateBatch` to explicitly group commands and execute them together:

```csharp
IBatch batch = db.CreateBatch();

Task<bool> setTask = batch.StringSetAsync("batch:key1", "value1");
Task<bool> expireTask = batch.KeyExpireAsync("batch:key1", TimeSpan.FromMinutes(30));
Task<RedisValue> getTask = batch.StringGetAsync("batch:key2");

// Execute all commands now
batch.Execute();

// Await results
await Task.WhenAll(setTask, expireTask, getTask);
Console.WriteLine(await getTask);
```

## Bulk Insert with Batch

```csharp
async Task BulkInsert(IDatabase db, Dictionary<string, string> data)
{
    IBatch batch = db.CreateBatch();
    var tasks = data.Select(kv =>
        batch.StringSetAsync(kv.Key, kv.Value, TimeSpan.FromHours(1))
    ).ToList();

    batch.Execute();
    await Task.WhenAll(tasks);
    Console.WriteLine($"Inserted {tasks.Count} keys");
}

// Usage
var data = Enumerable.Range(1, 1000)
    .ToDictionary(i => $"item:{i}", i => $"value-{i}");

await BulkInsert(db, data);
```

## Bulk Read with Batch

```csharp
async Task<Dictionary<string, string?>> BulkGet(IDatabase db, IEnumerable<string> keys)
{
    IBatch batch = db.CreateBatch();
    var keyList = keys.ToList();
    var tasks = keyList.Select(k => batch.StringGetAsync(k)).ToList();

    batch.Execute();
    var values = await Task.WhenAll(tasks);

    return keyList.Zip(values, (k, v) => (k, v: (string?)v))
                  .ToDictionary(x => x.k, x => x.v);
}
```

## Pipelining Hash Operations

```csharp
IBatch batch = db.CreateBatch();
var tasks = new List<Task>();

tasks.Add(batch.HashSetAsync("user:1", "name", "Alice"));
tasks.Add(batch.HashSetAsync("user:1", "email", "alice@example.com"));
tasks.Add(batch.HashSetAsync("user:1", "role", "admin"));
tasks.Add(batch.KeyExpireAsync("user:1", TimeSpan.FromHours(24)));

batch.Execute();
await Task.WhenAll(tasks);
```

## Transaction vs Batch

```csharp
// Batch - no atomicity guarantee
IBatch batch = db.CreateBatch();
// ...
batch.Execute();

// Transaction - MULTI/EXEC, atomic
ITransaction tran = db.CreateTransaction();
// ...
await tran.ExecuteAsync();
```

Use `CreateTransaction` when atomicity matters; `CreateBatch` when you just need to reduce round-trips.

## Summary

StackExchange.Redis pipelines commands automatically when multiple async tasks are started concurrently. `CreateBatch` gives explicit control over command grouping, which is useful for bulk inserts and reads. Batches reduce network round-trips significantly when writing or reading many keys. Use `CreateTransaction` instead when you need MULTI/EXEC atomicity rather than just throughput.
