# How to Use NRedisStack for Redis Modules in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, NRedisStack, .NET, CSharp, Module

Description: Learn how to use NRedisStack to access Redis modules like RedisJSON, RediSearch, and RedisTimeSeries in your .NET applications.

---

NRedisStack is the official .NET client library that provides access to Redis modules including RedisJSON, RediSearch, RedisTimeSeries, and RedisBloom. It builds on top of StackExchange.Redis and adds typed commands for each module.

## Installing NRedisStack

Add the NuGet package to your project:

```bash
dotnet add package NRedisStack
```

## Connecting to Redis

```csharp
using NRedisStack;
using NRedisStack.RedisStackCommands;
using StackExchange.Redis;

var connection = ConnectionMultiplexer.Connect("localhost:6379");
var db = connection.GetDatabase();
```

## Using RedisJSON

NRedisStack exposes a typed `JSON` command object:

```csharp
var json = db.JSON();

// Store a JSON document
await json.SetAsync("user:1", "$", new { name = "Alice", age = 30, active = true });

// Retrieve the document
var result = await json.GetAsync<dynamic>("user:1", path: "$");
Console.WriteLine(result);

// Update a nested field
await json.SetAsync("user:1", "$.age", 31);

// Increment a numeric field
await json.NumIncrbyAsync("user:1", "$.age", 1);
```

## Using RediSearch

Create an index and run full-text queries:

```csharp
var search = db.FT();

// Create an index on user documents
search.Create("users-idx",
    new FTCreateParams().On(IndexDataType.JSON).Prefix("user:"),
    new Schema()
        .AddTextField(new FieldName("$.name", "name"))
        .AddNumericField(new FieldName("$.age", "age")));

// Search for users
var results = search.Search("users-idx", new Query("Alice"));
foreach (var doc in results.Documents)
{
    Console.WriteLine(doc.Id);
}
```

## Using RedisTimeSeries

Track time-series metrics such as request latency:

```csharp
var ts = db.TS();

// Create a time series key
await ts.CreateAsync("latency:api", retentionTime: 86400000); // 1 day in ms

// Add a data point (timestamp 0 = auto)
await ts.AddAsync("latency:api", "*", 142.5);

// Query range
var points = await ts.RangeAsync("latency:api", "-", "+");
foreach (var p in points)
{
    Console.WriteLine($"{p.Time}: {p.Val}");
}
```

## Using RedisBloom

Probabilistic data structures for membership testing:

```csharp
var bloom = db.BF();

// Create and add items to a Bloom filter
await bloom.ReserveAsync("seen-emails", 0.01, 10000);
await bloom.AddAsync("seen-emails", "user@example.com");

// Check membership
bool exists = await bloom.ExistsAsync("seen-emails", "user@example.com");
Console.WriteLine(exists); // True
```

## Checking Module Availability

```csharp
// List loaded modules on the server
var server = connection.GetServer("localhost", 6379);
var modules = server.ModuleList();
foreach (var mod in modules)
{
    Console.WriteLine($"{mod.Name} v{mod.Version}");
}
```

NRedisStack is best used with Redis Stack, which bundles all modules together. You can run Redis Stack locally with:

```bash
docker run -d -p 6379:6379 redis/redis-stack-server:latest
```

## Summary

NRedisStack gives .NET developers typed, first-class access to Redis modules through a clean API. By combining RedisJSON, RediSearch, and RedisTimeSeries in one client, you can build rich search, document storage, and analytics features without switching libraries.
