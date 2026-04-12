# How to Use LINQ Queries with the MongoDB .NET Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, CSharp, LINQ, DotNet, Query

Description: Learn how to query MongoDB collections using standard LINQ syntax with the MongoDB .NET Driver's IQueryable provider.

---

## Overview

The MongoDB .NET Driver includes a LINQ provider that translates standard C# LINQ expressions into MongoDB query documents at runtime. This allows developers familiar with LINQ to query MongoDB using the same syntax they use for Entity Framework or LINQ to Objects - without writing JSON filter documents.

## Setup

```bash
dotnet add package MongoDB.Driver
```

Document model:

```csharp
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

public class Order
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; }
    public string CustomerId { get; set; }
    public string Status { get; set; }
    public double Total { get; set; }
    public List<string> Tags { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

Getting an IQueryable:

```csharp
var client = new MongoClient("mongodb://localhost:27017");
var db = client.GetDatabase("shopdb");
var orders = db.GetCollection<Order>("orders");

var queryable = orders.AsQueryable();
```

## Basic Filtering

```csharp
// Where clause
var pending = queryable
    .Where(o => o.Status == "PENDING")
    .ToList();

// Multiple conditions
var highValuePending = queryable
    .Where(o => o.Status == "PENDING" && o.Total >= 500)
    .ToList();

// Date range
var recent = queryable
    .Where(o => o.CreatedAt >= DateTime.UtcNow.AddDays(-7))
    .ToList();
```

## Projection with Select

```csharp
// Project to anonymous type
var summaries = queryable
    .Where(o => o.Status == "COMPLETED")
    .Select(o => new { o.CustomerId, o.Total, o.CreatedAt })
    .ToList();

// Project to a DTO
var dtos = queryable
    .Select(o => new OrderDto
    {
        OrderId = o.Id,
        Customer = o.CustomerId,
        Amount = o.Total
    })
    .ToList();
```

## Sorting

```csharp
// Single sort
var sorted = queryable
    .OrderByDescending(o => o.Total)
    .Take(10)
    .ToList();

// Multi-level sort
var multiSorted = queryable
    .Where(o => o.Status == "PENDING")
    .OrderBy(o => o.CustomerId)
    .ThenByDescending(o => o.CreatedAt)
    .ToList();
```

## Pagination with Skip and Take

```csharp
int page = 2;
int pageSize = 20;

var paginated = queryable
    .Where(o => o.Status == "COMPLETED")
    .OrderByDescending(o => o.CreatedAt)
    .Skip((page - 1) * pageSize)
    .Take(pageSize)
    .ToList();
```

## Aggregation Operations

```csharp
// Count
int count = queryable.Count(o => o.Status == "PENDING");

// Sum
double totalRevenue = queryable
    .Where(o => o.Status == "COMPLETED")
    .Sum(o => o.Total);

// Average
double avgOrder = queryable
    .Where(o => o.Status == "COMPLETED")
    .Average(o => o.Total);

// GroupBy
var byStatus = queryable
    .GroupBy(o => o.Status)
    .Select(g => new
    {
        Status = g.Key,
        Count = g.Count(),
        Total = g.Sum(o => o.Total)
    })
    .ToList();
```

## Array Queries

```csharp
// Contains (matches documents where array contains element)
var tagged = queryable
    .Where(o => o.Tags.Contains("urgent"))
    .ToList();

// Any with predicate
var withExpensiveItem = queryable
    .Where(o => o.Tags.Any(t => t.StartsWith("vip")))
    .ToList();
```

## Async LINQ

```csharp
using MongoDB.Driver.Linq;

// Use async extension methods from the driver
var pendingAsync = await queryable
    .Where(o => o.Status == "PENDING")
    .ToListAsync();

var firstAsync = await queryable
    .Where(o => o.CustomerId == "cust-001")
    .FirstOrDefaultAsync();
```

## Limitations

Not all LINQ operations translate to MongoDB. Complex joins across collections and some string operations may throw at runtime. When you hit a LINQ limitation, fall back to the `Builders<T>.Filter` API:

```csharp
// Fall back to filter builders for unsupported LINQ
var filter = Builders<Order>.Filter.Regex(o => o.CustomerId, "^CUST");
var results = await orders.Find(filter).ToListAsync();
```

## Summary

The MongoDB .NET Driver's LINQ provider translates standard C# LINQ expressions into MongoDB query documents, letting you use familiar `Where`, `Select`, `OrderBy`, `GroupBy`, and aggregation operators. Always use the async extension methods (`ToListAsync`, `FirstOrDefaultAsync`) for non-blocking execution, and fall back to `Builders<T>.Filter` for operations not covered by LINQ.
