# How to Troubleshoot Dapr .NET SDK Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, DotNet, Troubleshooting, Debugging, SDK, Microservice

Description: Diagnose and fix common Dapr .NET SDK issues including sidecar connection failures, component misconfiguration, and pub/sub delivery problems with practical steps.

---

## Overview

Dapr .NET applications have two moving parts: your application process and the Dapr sidecar. When something goes wrong it can be difficult to know which side is responsible. This guide covers the most common failure modes and how to resolve them efficiently.

## Checking Sidecar Health

Before investigating application code, confirm the sidecar is reachable:

```bash
# Default sidecar health endpoint
curl http://localhost:3500/v1.0/healthz

# Check the sidecar metadata
curl http://localhost:3500/v1.0/metadata | jq .
```

A `200 OK` from `/healthz` confirms the sidecar is running. If you get a connection refused, the sidecar has not started or is using a different port.

## Enabling Debug Logging

Set the log level when running with the CLI:

```bash
dapr run --app-id my-service --log-level debug -- dotnet run
```

In your .NET application, enable verbose HTTP logging to see every Dapr API call:

```csharp
builder.Logging.AddFilter("Dapr", LogLevel.Debug);
builder.Logging.AddFilter("System.Net.Http.HttpClient", LogLevel.Trace);
```

## DaprException: Component Not Found

If a `DaprException` says a component is missing, verify the component file is in the path passed to `--resources-path` and that the `metadata.name` matches what your code uses:

```yaml
# components/statestore.yaml
metadata:
  name: statestore   # must match the name in SaveStateAsync("statestore", ...)
```

```bash
# List loaded components via sidecar metadata
curl http://localhost:3500/v1.0/metadata | jq '.components'
```

## Pub/Sub Messages Not Delivered

If subscriptions are not receiving messages, verify the subscribe handler is registered:

```csharp
// Must be present in Program.cs
app.MapSubscribeHandler();
```

Check that the subscription endpoint is reachable from the sidecar:

```bash
curl http://localhost:5001/dapr/subscribe | jq .
```

## Service Invocation: Name Resolution Failures

When `InvokeMethodAsync` fails with `StatusCode.Unavailable`, ensure the target service is running and registered:

```bash
dapr list  # confirm app-id is listed
dapr invoke --app-id target-service --method health --verb GET
```

## Actor Registration Errors

If your actor host fails to start, verify the actor types are registered before `app.Run()`:

```csharp
app.MapActorsHandlers();  // must come before app.Run()
```

## Checking the Dapr Dashboard

```bash
dapr dashboard
```

The dashboard shows component health, active subscriptions, and actor placement status - all useful for narrowing down configuration problems.

## Summary

Most Dapr .NET issues fall into three categories: sidecar not running, component misconfiguration, or missing middleware registration. Checking the sidecar health endpoint first, enabling debug logging, and verifying the loaded components via the metadata API will resolve the majority of problems quickly.
