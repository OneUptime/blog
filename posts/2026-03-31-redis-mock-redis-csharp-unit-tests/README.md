# How to Mock Redis in C# Unit Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CSharp, Testing, Unit Test, Mock

Description: Learn how to mock Redis in C# unit tests using FakeItEasy, Moq, or the dedicated MockRedis package to test Redis-dependent code without a live server.

---

Testing Redis-dependent code without a running Redis server keeps unit tests fast and isolated. In .NET, you have several options: mock the `IDatabase` interface with Moq, mock `IConnectionMultiplexer` to control database creation, or abstract Redis behind your own interface.

## Option 1 - Mocking IDatabase with Moq

Install Moq:

```bash
dotnet add package Moq
dotnet add package StackExchange.Redis
```

Create a service that depends on `IDatabase`:

```csharp
public class CacheService
{
    private readonly IDatabase _db;

    public CacheService(IDatabase db)
    {
        _db = db;
    }

    public async Task<string?> GetUserAsync(string userId)
    {
        return await _db.StringGetAsync($"user:{userId}");
    }

    public async Task SetUserAsync(string userId, string value, TimeSpan ttl)
    {
        await _db.StringSetAsync($"user:{userId}", value, ttl);
    }
}
```

Write unit tests:

```csharp
using Moq;
using StackExchange.Redis;
using Xunit;

public class CacheServiceTests
{
    private readonly Mock<IDatabase> _mockDb;
    private readonly CacheService _service;

    public CacheServiceTests()
    {
        _mockDb = new Mock<IDatabase>();
        _service = new CacheService(_mockDb.Object);
    }

    [Fact]
    public async Task GetUserAsync_ReturnsValue_WhenKeyExists()
    {
        _mockDb.Setup(db => db.StringGetAsync("user:42", CommandFlags.None))
               .ReturnsAsync("alice");

        var result = await _service.GetUserAsync("42");

        Assert.Equal("alice", result);
    }

    [Fact]
    public async Task SetUserAsync_CallsStringSet_WithCorrectArgs()
    {
        await _service.SetUserAsync("42", "alice", TimeSpan.FromMinutes(10));

        _mockDb.Verify(db => db.StringSetAsync(
            "user:42", "alice", TimeSpan.FromMinutes(10),
            It.IsAny<When>(), It.IsAny<CommandFlags>()), Times.Once);
    }
}
```

## Option 2 - Mocking IConnectionMultiplexer

When your code depends on `IConnectionMultiplexer` instead of `IDatabase`, mock the multiplexer to return a mocked database:

```csharp
using Moq;
using StackExchange.Redis;

var mockMultiplexer = new Mock<IConnectionMultiplexer>();
var mockDb = new Mock<IDatabase>();

mockMultiplexer.Setup(m => m.GetDatabase(It.IsAny<int>(), It.IsAny<object>()))
               .Returns(mockDb.Object);

mockDb.Setup(db => db.StringGetAsync("key", CommandFlags.None))
      .ReturnsAsync("value");

var db = mockMultiplexer.Object.GetDatabase();
var val = await db.StringGetAsync("key");
Console.WriteLine(val); // value
```

## Option 3 - Abstract Behind an Interface

For maximum testability, wrap Redis behind your own interface:

```csharp
public interface IRedisCache
{
    Task<string?> GetAsync(string key);
    Task SetAsync(string key, string value, TimeSpan? ttl = null);
}

public class RedisCache : IRedisCache
{
    private readonly IDatabase _db;
    public RedisCache(IConnectionMultiplexer mux) => _db = mux.GetDatabase();

    public async Task<string?> GetAsync(string key) =>
        await _db.StringGetAsync(key);

    public async Task SetAsync(string key, string value, TimeSpan? ttl = null) =>
        await _db.StringSetAsync(key, value, ttl);
}
```

Then mock `IRedisCache` directly - no StackExchange.Redis knowledge required in tests:

```csharp
var mockCache = new Mock<IRedisCache>();
mockCache.Setup(c => c.GetAsync("session:abc")).ReturnsAsync("user-data");
```

## Verifying No Interaction

```csharp
mockCache.Verify(c => c.SetAsync(It.IsAny<string>(), It.IsAny<string>(), null), Times.Never);
```

## Summary

Mocking Redis in C# tests is straightforward with Moq against the `IDatabase` interface or by abstracting Redis behind your own interface. Wrapping Redis in a custom interface is the cleanest approach and keeps your tests free of StackExchange.Redis internals.
