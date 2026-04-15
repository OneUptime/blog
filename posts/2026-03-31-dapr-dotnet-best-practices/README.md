# How to Use Dapr .NET SDK Best Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, DotNet, Best Practice, SDK, Microservice, Architecture

Description: A collection of proven best practices for building production-grade Dapr .NET applications, covering client configuration, error handling, and observability.

---

## Overview

Building reliable Dapr .NET applications requires more than just calling the API. This guide covers established patterns for client configuration, error handling, observability, and testing that reduce operational surprises in production.

## Use a Singleton DaprClient

`DaprClient` manages an underlying gRPC channel. Register it as a singleton to avoid port exhaustion and improve connection reuse:

```csharp
builder.Services.AddDaprClient(); // singleton by default - correct
// Never do: builder.Services.AddScoped<DaprClient>() // creates new connections per request
```

## Centralize Component Names as Constants

Avoid scattering string literals throughout your codebase:

```csharp
public static class DaprComponents
{
    public const string StateStore = "statestore";
    public const string PubSub = "pubsub";
    public const string SecretStore = "local-secret-store";
}

// Usage
await dapr.SaveStateAsync(DaprComponents.StateStore, key, value);
```

## Use Strong Typing for State

Retrieve state with explicit type parameters so deserialization errors surface early:

```csharp
// Prefer this
var order = await dapr.GetStateAsync<Order>(DaprComponents.StateStore, id);

// Avoid this
var raw = await dapr.GetStateAsync<JsonElement>(DaprComponents.StateStore, id);
```

## Handle DaprException Specifically

Catch `DaprException` separately from general exceptions to apply appropriate retry or circuit-breaking logic:

```csharp
try
{
    await dapr.SaveStateAsync(DaprComponents.StateStore, id, order);
}
catch (DaprException ex) when (ex.InnerException is RpcException rpcEx && rpcEx.StatusCode == StatusCode.Unavailable)
{
    // Transient - log and rethrow for Polly to retry
    logger.LogWarning(ex, "State store unavailable");
    throw;
}
catch (DaprException ex)
{
    // Permanent failure
    logger.LogError(ex, "Dapr error saving order {Id}", id);
    throw;
}
```

## Enable OpenTelemetry Tracing

Dapr sidecars emit traces automatically, but your application must also export spans to correlate them:

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .AddAspNetCoreInstrumentation()
            .AddGrpcClientInstrumentation()
            .AddOtlpExporter(opts =>
            {
                opts.Endpoint = new Uri("http://otel-collector:4317");
            });
    });
```

## Avoid Blocking Calls

Never block on Dapr async methods in synchronous contexts:

```csharp
// Wrong
var order = dapr.GetStateAsync<Order>("statestore", id).Result;

// Correct
var order = await dapr.GetStateAsync<Order>("statestore", id);
```

## Use ETag-Based Concurrency for State

Protect shared state from concurrent modifications using ETags:

```csharp
var (value, etag) = await dapr.GetStateAndETagAsync<int>("statestore", "counter");
var saved = await dapr.TrySaveStateAsync("statestore", "counter", value + 1, etag);
if (!saved) throw new ConcurrencyException("Counter was modified concurrently");
```

## Summary

Production-quality Dapr .NET applications rely on a singleton `DaprClient`, centralized component name constants, explicit error handling with `DaprException`, and OpenTelemetry integration for end-to-end tracing. Applying ETag-based concurrency control for shared state prevents data corruption in high-throughput scenarios.
