# How to Handle Errors Using Dapr .NET Error Model

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, DotNet, Error Handling, SDK, Microservice, Resilience

Description: Learn how to use the Dapr .NET SDK error model to handle gRPC status codes, categorize failures, and build resilient error-handling logic in your services.

---

## Overview

The Dapr .NET SDK exposes a structured error model based on gRPC status codes. When a Dapr API call fails, the SDK throws a `DaprException` that wraps the underlying `RpcException`, allowing you to distinguish between transient network failures, component errors, and application-level rejections. Extended error details are available through the `TryGetExtendedErrorInfo()` extension method.

## Understanding DaprException

Every failed Dapr API call throws a `DaprException`:

```csharp
using Dapr;
using Dapr.Client;
using Grpc.Core;

try
{
    var order = await daprClient.GetStateAsync<Order>("statestore", "order-99");
}
catch (DaprException ex)
{
    Console.WriteLine($"Status: {ex.InnerException?.Message}");
    if (ex.InnerException is RpcException rpcEx)
    {
        Console.WriteLine($"gRPC code: {rpcEx.StatusCode}");
    }
}
```

## Handling Specific Error Codes

Check the `InnerException` for a gRPC `RpcException` and use its `StatusCode` to react to specific error codes:

```csharp
using Dapr;
using Grpc.Core;

try
{
    await daprClient.InvokeMethodAsync(HttpMethod.Post, "payment-service", "charge", payload);
}
catch (DaprException ex) when (ex.InnerException is RpcException { StatusCode: StatusCode.Unavailable })
{
    // Downstream service unreachable - apply retry logic
    logger.LogWarning("Payment service unavailable, retrying...");
    throw;
}
catch (DaprException ex) when (ex.InnerException is RpcException { StatusCode: StatusCode.InvalidArgument })
{
    // Caller sent bad data
    return Results.BadRequest(ex.Message);
}
catch (DaprException ex) when (ex.InnerException is RpcException { StatusCode: StatusCode.NotFound })
{
    return Results.NotFound();
}
```

## Reading Extended Error Details

For richer error information, use the `TryGetExtendedErrorInfo()` extension method from the `Dapr.Common.Exceptions` namespace:

```csharp
using Dapr.Common.Exceptions;

catch (DaprException ex)
{
    if (ex.TryGetExtendedErrorInfo(out var errorInfo))
    {
        foreach (var detail in errorInfo.Details)
        {
            Console.WriteLine($"Error type: {detail.ErrorType}");
            if (detail is DaprErrorInfoDetail errorDetail)
            {
                Console.WriteLine($"Reason: {errorDetail.Reason}");
                Console.WriteLine($"Domain: {errorDetail.Domain}");
            }
        }
    }
}
```

## Combining with Polly for Resilience

Wrap Dapr calls with Polly retry policies for transient errors:

```csharp
using Polly;
using Polly.Retry;
using Grpc.Core;

var retryPolicy = Policy
    .Handle<DaprException>(ex =>
        ex.InnerException is RpcException rpc && rpc.StatusCode == StatusCode.Unavailable)
    .WaitAndRetryAsync(3, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)));

var order = await retryPolicy.ExecuteAsync(async () =>
    await daprClient.GetStateAsync<Order>("statestore", orderId));
```

## Returning Errors from Service Methods

When your service encounters an error that should propagate to callers through Dapr service invocation, return an appropriate HTTP status code:

```csharp
app.MapGet("/orders/{id}", async (string id, DaprClient dapr) =>
{
    var order = await dapr.GetStateAsync<Order>("statestore", id);
    return order is null ? Results.NotFound($"Order {id} not found") : Results.Ok(order);
});
```

## Summary

The Dapr .NET error model centers on `DaprException`, which wraps the underlying gRPC `RpcException`. By pattern-matching on the inner `RpcException.StatusCode`, reading extended error details via `TryGetExtendedErrorInfo()`, and combining with Polly retry policies, you can build resilient .NET microservices that handle both transient and permanent failures gracefully.
