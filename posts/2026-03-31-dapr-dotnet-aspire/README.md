# How to Use Dapr with .NET Aspire

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, DotNet, Aspire, Microservice, Orchestration, Cloud

Description: Learn how to combine Dapr's distributed systems building blocks with .NET Aspire's local development orchestration for a powerful microservices setup.

---

## Overview

.NET Aspire and Dapr are complementary tools. Aspire handles local service orchestration and observability dashboards, while Dapr provides portable building blocks like pub/sub, state management, and service invocation. Together they create an excellent local development experience for distributed .NET applications.

## Prerequisites

Install the Aspire workload and Dapr CLI:

```bash
dotnet workload install aspire
dapr init
```

## Setting Up the AppHost Project

Add the Dapr Aspire integration package to your AppHost:

```bash
dotnet add package Aspire.Hosting.Dapr
```

Wire up Dapr sidecars in your AppHost `Program.cs`:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var stateStore = builder.AddDaprStateStore("statestore");
var pubSub = builder.AddDaprPubSub("pubsub");

var orderService = builder.AddProject<Projects.OrderService>("order-service")
    .WithDaprSidecar(new DaprSidecarOptions
    {
        AppId = "order-service",
        AppPort = 5001
    })
    .WithReference(stateStore)
    .WithReference(pubSub);

var inventoryService = builder.AddProject<Projects.InventoryService>("inventory-service")
    .WithDaprSidecar(new DaprSidecarOptions
    {
        AppId = "inventory-service",
        AppPort = 5002
    })
    .WithReference(pubSub);

builder.Build().Run();
```

## Configuring Service Projects

Each service project uses the standard Dapr .NET SDK. No extra setup is needed because Aspire injects environment variables that the Dapr sidecar uses for service discovery:

```csharp
// OrderService/Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.AddServiceDefaults(); // Aspire defaults (telemetry, health checks)
builder.Services.AddDaprClient();

var app = builder.Build();
app.MapDefaultEndpoints();
app.UseCloudEvents();
app.MapSubscribeHandler();

app.MapPost("/orders", async (Order order, DaprClient dapr) =>
{
    await dapr.SaveStateAsync("statestore", order.Id, order);
    await dapr.PublishEventAsync("pubsub", "new-order", order);
    return Results.Created($"/orders/{order.Id}", order);
});

app.Run();
```

## Observing Traces in the Aspire Dashboard

Aspire automatically collects OpenTelemetry traces from both your application and the Dapr sidecar. Start the AppHost and open the dashboard:

```bash
dotnet run --project AppHost
# Dashboard URL is printed in the console output
```

You will see distributed traces that span service boundaries, including Dapr sidecar calls to state stores and pub/sub brokers.

## Adding a Redis State Store Component

Aspire can provision a Redis container and wire it to Dapr automatically:

```csharp
var redis = builder.AddRedis("redis");
var stateStore = builder.AddDaprStateStore("statestore").WithReference(redis);
```

## Summary

.NET Aspire and Dapr together provide a productive local development experience: Aspire handles service orchestration and telemetry collection while Dapr supplies portable distributed-systems primitives. The `Aspire.Hosting.Dapr` package makes it straightforward to attach Dapr sidecars to any project in your AppHost with just a few lines of code.
