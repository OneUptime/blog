# How to Use Connection Pooling with the MongoDB .NET Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, CSharp, Connection Pool, DotNet, Performance

Description: Learn how the MongoDB .NET Driver manages connection pools and how to tune pool settings for optimal performance in production.

---

## How Connection Pooling Works

The MongoDB .NET Driver manages a connection pool per server (replica set member or mongos). When your application opens a database operation, the driver checks out a connection from the pool, executes the command, and returns the connection. This avoids the overhead of creating a new TCP connection for every operation.

`MongoClient` is the pool owner - it must be created once and shared as a singleton across your entire application. Creating multiple `MongoClient` instances multiplies the pool size unnecessarily.

## Default Pool Behavior

By default, the driver:
- Maintains a minimum of 0 idle connections.
- Allows a maximum of 100 connections per server.
- Waits up to 2 minutes for a connection to become available.
- Keeps idle connections alive with heartbeats.

## Configuring the Connection Pool

Use `MongoClientSettings` to tune pool parameters:

```csharp
using MongoDB.Driver;
using System;

var settings = MongoClientSettings.FromConnectionString(
    "mongodb://localhost:27017");

// Pool size
settings.MaxConnectionPoolSize = 200;   // max open connections
settings.MinConnectionPoolSize = 10;    // always keep 10 warm connections

// Timeouts
settings.WaitQueueTimeout  = TimeSpan.FromSeconds(15); // wait for a connection
settings.ConnectTimeout    = TimeSpan.FromSeconds(10); // TCP connect timeout
settings.SocketTimeout     = TimeSpan.FromSeconds(60); // socket read/write timeout

// Idle lifetime
settings.MaxConnectionIdleTime = TimeSpan.FromMinutes(10);
settings.MaxConnectionLifeTime = TimeSpan.FromMinutes(30);

var client = new MongoClient(settings);
```

Or via connection string query parameters:

```csharp
var client = new MongoClient(
    "mongodb://localhost:27017/?maxPoolSize=200&minPoolSize=10&waitQueueTimeoutMS=15000");
```

## Registering as a Singleton in ASP.NET Core

```csharp
// Program.cs
builder.Services.AddSingleton<IMongoClient>(sp =>
{
    var settings = MongoClientSettings.FromConnectionString(
        builder.Configuration.GetConnectionString("MongoDB"));

    settings.MaxConnectionPoolSize = 200;
    settings.MinConnectionPoolSize = 10;

    return new MongoClient(settings);
});

builder.Services.AddScoped<IMongoDatabase>(sp =>
    sp.GetRequiredService<IMongoClient>().GetDatabase("shopdb"));
```

Never register `MongoClient` as a scoped or transient service.

## Monitoring Pool Events

Subscribe to connection pool events for observability:

```csharp
using MongoDB.Driver.Core.Events;

settings.ClusterConfigurator = builder =>
{
    builder.Subscribe<ConnectionPoolOpenedEvent>(e =>
        Console.WriteLine($"Pool opened for {e.ServerId.EndPoint}"));

    builder.Subscribe<ConnectionPoolCheckedOutConnectionEvent>(e =>
        Console.WriteLine($"Connection {e.ConnectionId} checked out"));

    builder.Subscribe<ConnectionPoolCheckedInConnectionEvent>(e =>
        Console.WriteLine($"Connection {e.ConnectionId} returned to pool"));

    builder.Subscribe<ConnectionPoolCheckingOutConnectionFailedEvent>(e =>
        Console.WriteLine($"Pool exhausted: {e.Reason}"));
};
```

## Pool Sizing Guidelines

Pool exhaustion (waiting in queue) is a sign your pool is too small or queries are too slow. General guidance:

```text
Max Pool Size = (peak concurrent requests) * (avg DB calls per request)
```

For an ASP.NET Core API expecting 100 concurrent requests with 3 DB calls each, set `MaxConnectionPoolSize` to at least 300. Always load-test before committing to a value.

## Diagnosing Pool Problems

```csharp
// Instrument with OpenTelemetry or Prometheus
// The driver emits CMAP (Connection Monitoring and Pooling) events

// Example: Log slow check-out times
settings.ClusterConfigurator = builder =>
{
    builder.Subscribe<ConnectionPoolCheckingOutConnectionFailedEvent>(e =>
    {
        // Log this as an alert - pool is exhausted
        logger.LogWarning(
            "Connection pool exhausted. Reason: {Reason}", e.Reason);
    });
};
```

## Summary

The MongoDB .NET Driver's connection pool is configured through `MongoClientSettings` by setting `MaxConnectionPoolSize`, `MinConnectionPoolSize`, `WaitQueueTimeout`, and idle/lifetime timeouts. The most critical rule is to create one `MongoClient` per application - registered as a singleton - so the pool is shared correctly. Subscribe to CMAP events to monitor pool health, and size the pool based on your peak concurrency profile.
