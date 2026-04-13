# How to Use Aggregation Pipelines with the MongoDB .NET Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, CSharp, Aggregation, Pipeline, DotNet

Description: Learn how to build and execute MongoDB aggregation pipelines in C# using the .NET Driver's PipelineDefinition and stage builders.

---

## Overview

MongoDB's aggregation framework processes documents through a sequence of stages - filtering, grouping, projecting, sorting, and joining. The .NET Driver provides a strongly-typed `PipelineDefinitionBuilder` and a BsonDocument-based approach for building these pipelines in C#.

## Setup

```bash
dotnet add package MongoDB.Driver
```

Register a camelCase naming convention so C# PascalCase properties map to camelCase fields in MongoDB (used by the BsonDocument examples below):

```csharp
using MongoDB.Bson.Serialization.Conventions;

var pack = new ConventionPack { new CamelCaseElementNameConvention() };
ConventionRegistry.Register("camelCase", pack, t => true);
```

Models:

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
    public string Category { get; set; }
    public double Amount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CategorySummary
{
    [BsonId]
    public string Category { get; set; }
    public double TotalRevenue { get; set; }
    public int OrderCount { get; set; }
}
```

## Building a Pipeline with PipelineDefinitionBuilder

```csharp
var client = new MongoClient("mongodb://localhost:27017");
var db = client.GetDatabase("shopdb");
var orders = db.GetCollection<Order>("orders");

var pipeline = new EmptyPipelineDefinition<Order>()
    .Match(Builders<Order>.Filter.Eq(o => o.Status, "completed"))
    .Group(
        o => o.Category,
        g => new CategorySummary
        {
            Category = g.Key,
            TotalRevenue = g.Sum(o => o.Amount),
            OrderCount = g.Count()
        }
    )
    .SortByDescending(s => s.TotalRevenue)
    .Limit(5);

var results = await orders.Aggregate(pipeline).ToListAsync();
results.ForEach(r =>
    Console.WriteLine($"{r.Category}: ${r.TotalRevenue:F2} ({r.OrderCount} orders)"));
```

## Using BsonDocument Stages

For more control, define stages as raw BSON documents:

```csharp
var pipeline = new[]
{
    new BsonDocument("$match",
        new BsonDocument("status", "completed")),

    new BsonDocument("$group",
        new BsonDocument
        {
            { "_id", "$category" },
            { "totalRevenue", new BsonDocument("$sum", "$amount") },
            { "orderCount",   new BsonDocument("$sum", 1) }
        }),

    new BsonDocument("$sort",
        new BsonDocument("totalRevenue", -1)),

    new BsonDocument("$limit", 5)
};

var results = await orders
    .Aggregate<BsonDocument>(PipelineDefinition<Order, BsonDocument>
        .Create(pipeline))
    .ToListAsync();

foreach (var doc in results)
    Console.WriteLine(doc.ToJson());
```

## Lookup (Left Outer Join)

```csharp
var lookupPipeline = new EmptyPipelineDefinition<Order>()
    .Match(Builders<Order>.Filter.Eq(o => o.Status, "pending"))
    .Lookup<Order, Order, Customer, OrderWithCustomer>(
        db.GetCollection<Customer>("customers"),
        localField: o => o.CustomerId,
        foreignField: c => c.Id,
        @as: owc => owc.CustomerDetails
    )
    .Unwind(owc => owc.CustomerDetails);

var enrichedOrders = await orders.Aggregate(lookupPipeline).ToListAsync();
```

## Unwind and Group

```csharp
var pipeline = new EmptyPipelineDefinition<Article>()
    .Unwind(a => a.Tags)
    .Group(a => a.Tags, g => new TagCount
    {
        Tag = g.Key,
        Count = g.Count()
    })
    .SortByDescending(t => t.Count)
    .Limit(10);
```

## Date-Based Grouping

```csharp
// Group by year and month using BsonDocument
var datePipeline = new[]
{
    new BsonDocument("$match",
        new BsonDocument("status", "completed")),

    new BsonDocument("$group",
        new BsonDocument
        {
            { "_id", new BsonDocument
                {
                    { "year",  new BsonDocument("$year",  "$createdAt") },
                    { "month", new BsonDocument("$month", "$createdAt") }
                }
            },
            { "revenue", new BsonDocument("$sum", "$amount") }
        }),

    new BsonDocument("$sort",
        new BsonDocument { { "_id.year", 1 }, { "_id.month", 1 } })
};
```

## Running Explain on a Pipeline

```csharp
var explainCommand = new BsonDocument
{
    { "explain", new BsonDocument
        {
            { "aggregate", "orders" },
            { "pipeline", new BsonArray(datePipeline) },
            { "cursor", new BsonDocument() }
        }
    }
};
var explanation = await db.RunCommandAsync<BsonDocument>(explainCommand);
Console.WriteLine(explanation.ToJson());
```

## Summary

The MongoDB .NET Driver supports aggregation pipelines through the typed `PipelineDefinitionBuilder` for compile-time safety and raw `BsonDocument` stages for full flexibility. Use `Match`, `Group`, `Sort`, `Limit`, `Lookup`, and `Unwind` stage methods for clean C# code, and fall back to BsonDocument arrays when you need operators not yet covered by the builder. Always call `ToListAsync()` for non-blocking pipeline execution.
