# How to Connect to MongoDB from C# Using the .NET Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, CSharp, DotNet, Driver, Connection

Description: Learn how to install the MongoDB .NET Driver, create a client, and establish connections to MongoDB from a C# application.

---

## Overview

The MongoDB .NET Driver is the official library for connecting to MongoDB from C# and other .NET languages. It supports synchronous and asynchronous operations, LINQ queries, and BSON document mapping. This guide covers installation, client configuration, and connection best practices.

## Installation

Install via NuGet:

```bash
dotnet add package MongoDB.Driver
```

Or in the Package Manager Console:

```bash
Install-Package MongoDB.Driver
```

## Creating a MongoClient

```csharp
using MongoDB.Driver;

// Connection string - simplest form
var client = new MongoClient("mongodb://localhost:27017");

// With credentials
var client = new MongoClient(
    "mongodb://username:password@localhost:27017/shopdb?authSource=admin");

// Atlas connection string
var client = new MongoClient(
    "mongodb+srv://user:password@cluster0.example.mongodb.net/shopdb");
```

## Using MongoClientSettings for Advanced Configuration

```csharp
using MongoDB.Driver;
using System;

var settings = MongoClientSettings.FromConnectionString(
    "mongodb://localhost:27017");

settings.ServerSelectionTimeout = TimeSpan.FromSeconds(5);
settings.ConnectTimeout = TimeSpan.FromSeconds(10);
settings.SocketTimeout = TimeSpan.FromSeconds(30);

// Connection pool settings
settings.MaxConnectionPoolSize = 100;
settings.MinConnectionPoolSize = 5;
settings.MaxConnectionIdleTime = TimeSpan.FromMinutes(10);

var client = new MongoClient(settings);
```

## Getting a Database and Collection

```csharp
// Get database (created lazily)
var database = client.GetDatabase("shopdb");

// Get typed collection
var products = database.GetCollection<Product>("products");

// Get BsonDocument collection (schema-less)
var rawCollection = database.GetCollection<BsonDocument>("products");
```

## Defining a Document Model

```csharp
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

public class Product
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; }

    [BsonElement("name")]
    public string Name { get; set; }

    public double Price { get; set; }

    public string Category { get; set; }

    public int Stock { get; set; }
}
```

`[BsonId]` maps the property to `_id`. `[BsonRepresentation(BsonType.ObjectId)]` allows using a `string` type in C# while storing an `ObjectId` in MongoDB.

## Testing the Connection

```csharp
using MongoDB.Bson;

try
{
    var result = await database.RunCommandAsync<BsonDocument>(
        new BsonDocument("ping", 1));
    Console.WriteLine("Connected successfully to MongoDB!");
}
catch (Exception ex)
{
    Console.WriteLine($"Connection failed: {ex.Message}");
}
```

## Dependency Injection in ASP.NET Core

Register `MongoClient` as a singleton:

```csharp
// Program.cs
using MongoDB.Driver;

builder.Services.AddSingleton<IMongoClient>(sp =>
    new MongoClient(builder.Configuration.GetConnectionString("MongoDB")));

builder.Services.AddScoped<IMongoDatabase>(sp =>
    sp.GetRequiredService<IMongoClient>().GetDatabase("shopdb"));
```

```json
// appsettings.json
{
  "ConnectionStrings": {
    "MongoDB": "mongodb://localhost:27017"
  }
}
```

A repository class:

```csharp
public class ProductRepository
{
    private readonly IMongoCollection<Product> _collection;

    public ProductRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<Product>("products");
    }
}
```

## Handling Connection Events

```csharp
using MongoDB.Driver;
using MongoDB.Driver.Core.Events;

var settings = MongoClientSettings.FromConnectionString("mongodb://localhost:27017");

settings.ClusterConfigurator = builder =>
{
    builder.Subscribe<CommandStartedEvent>(e =>
        Console.WriteLine($"Command started: {e.CommandName}"));
    builder.Subscribe<CommandFailedEvent>(e =>
        Console.WriteLine($"Command failed: {e.CommandName} - {e.Failure}"));
};

var client = new MongoClient(settings);
```

## Summary

The MongoDB .NET Driver uses `MongoClient` as the entry point - create it once and share it as a singleton across your application. Use `MongoClientSettings` to configure timeouts, pool size, and TLS. Annotate C# classes with `[BsonId]` and `[BsonElement]` to control document mapping, and register `MongoClient` with the ASP.NET Core DI container for clean dependency injection throughout your application.
