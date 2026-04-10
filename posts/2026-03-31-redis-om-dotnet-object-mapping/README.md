# How to Use redis-om-dotnet for Object Mapping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, redis-om, .NET, CSharp, ORM

Description: Learn how to use redis-om-dotnet to map C# objects to Redis, enabling LINQ queries, indexing, and document storage with minimal boilerplate.

---

redis-om-dotnet (Redis Object Mapping for .NET) is a library that abstracts Redis data structures behind familiar C# patterns. It supports LINQ-based queries, automatic index management, and both Hash and JSON storage.

## Installation

```bash
dotnet add package Redis.OM
```

## Defining a Document Model

Decorate your class with `[Document]` and mark searchable fields:

```csharp
using Redis.OM.Modeling;

[Document(StorageType = StorageType.Json, Prefixes = new[] { "customer" })]
public class Customer
{
    [RedisIdField]
    [Indexed]
    public string? Id { get; set; }

    [Indexed]
    public string? FirstName { get; set; }

    [Indexed]
    public string? LastName { get; set; }

    [Indexed]
    public string? Email { get; set; }

    [Indexed(Sortable = true)]
    public int Age { get; set; }
}
```

## Setting Up the Connection

```csharp
using Redis.OM;

var provider = new RedisConnectionProvider("redis://localhost:6379");

// Create indexes (run once at startup)
await provider.Connection.CreateIndexAsync(typeof(Customer));
```

## Creating and Saving Objects

```csharp
var customers = provider.RedisCollection<Customer>();

var customer = new Customer
{
    FirstName = "Alice",
    LastName = "Smith",
    Email = "alice@example.com",
    Age = 29
};

var id = await customers.InsertAsync(customer);
Console.WriteLine($"Saved: {id}");
```

## Querying with LINQ

```csharp
// Find by exact match
var alice = await customers
    .Where(c => c.FirstName == "Alice")
    .FirstOrDefaultAsync();

// Filter by age range
var adults = customers
    .Where(c => c.Age >= 18 && c.Age <= 65)
    .ToList();

// Exact match on last name
var smiths = customers
    .Where(c => c.LastName == "Smith")
    .ToList();
```

## Updating a Record

```csharp
if (alice != null)
{
    alice.Age = 30;
    await customers.UpdateAsync(alice);
}
```

## Deleting a Record

```csharp
await customers.DeleteAsync(alice!);
```

## Using Hash Storage

For simpler flat objects, use Hash storage instead of JSON:

```csharp
[Document(StorageType = StorageType.Hash, Prefixes = new[] { "session" })]
public class Session
{
    [RedisIdField]
    [Indexed]
    public string? Id { get; set; }

    [Indexed]
    public string? UserId { get; set; }

    public DateTime CreatedAt { get; set; }
}
```

## Dependency Injection in ASP.NET Core

```csharp
// Program.cs
builder.Services.AddSingleton(new RedisConnectionProvider("redis://localhost:6379"));
builder.Services.AddHostedService<IndexCreationService>();

// Use in a controller
public class CustomerController : ControllerBase
{
    private readonly IRedisCollection<Customer> _customers;

    public CustomerController(RedisConnectionProvider provider)
    {
        _customers = provider.RedisCollection<Customer>();
    }
}
```

redis-om-dotnet requires Redis Stack (or a Redis instance with RedisJSON and RediSearch modules loaded) for JSON storage and LINQ queries.

## Summary

redis-om-dotnet lets you work with Redis as if it were an object store, using C# classes, attributes, and LINQ queries. It handles index creation, serialization, and key management automatically, making Redis-backed repositories much simpler to build and maintain.
