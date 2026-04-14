# How to Implement Retry Workflow with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Retry, Resilience, Microservice

Description: Learn how to implement retry logic in Dapr Workflow to handle transient failures gracefully with configurable backoff strategies and error handling.

---

## Why Retry Workflows Matter

Distributed systems fail. Network timeouts, service unavailability, and transient database errors are facts of life. A retry workflow lets you build fault tolerance directly into your business logic rather than wrapping every call in ad-hoc try/catch blocks.

Dapr Workflow provides a durable execution model where retries are first-class citizens. If your workflow crashes mid-execution, Dapr replays it from the last successful checkpoint automatically.

## Defining a Retry Policy

Dapr Workflow uses activity-level retry policies. You attach a `WorkflowTaskOptions` object when calling an activity to specify how many times to retry and how long to wait between attempts.

```csharp
var retryOptions = new WorkflowTaskOptions
{
    RetryPolicy = new WorkflowRetryPolicy(
        maxNumberOfAttempts: 5,
        firstRetryInterval: TimeSpan.FromSeconds(2),
        backoffCoefficient: 2.0,
        maxRetryInterval: TimeSpan.FromSeconds(30)
    )
};
```

The `backoffCoefficient` doubles the wait time after each failure. A first retry at 2 seconds becomes 4, then 8, capped at 30 seconds.

## Building the Workflow

```csharp
public class OrderProcessingWorkflow : Workflow<OrderInput, OrderResult>
{
    public override async Task<OrderResult> RunAsync(
        WorkflowContext context, OrderInput input)
    {
        var retryOptions = new WorkflowTaskOptions
        {
            RetryPolicy = new WorkflowRetryPolicy(
                maxNumberOfAttempts: 3,
                firstRetryInterval: TimeSpan.FromSeconds(5),
                backoffCoefficient: 2.0)
        };

        // Reserve inventory with retries
        var reserved = await context.CallActivityAsync<bool>(
            nameof(ReserveInventoryActivity),
            input.OrderId,
            retryOptions);

        if (!reserved)
        {
            return new OrderResult { Status = "OutOfStock" };
        }

        // Charge payment with retries
        var charged = await context.CallActivityAsync<bool>(
            nameof(ChargePaymentActivity),
            input.PaymentInfo,
            retryOptions);

        return new OrderResult
        {
            Status = charged ? "Completed" : "PaymentFailed"
        };
    }
}
```

## Implementing a Retryable Activity

```csharp
public class ReserveInventoryActivity : WorkflowActivity<string, bool>
{
    private readonly InventoryClient _client;

    public ReserveInventoryActivity(InventoryClient client)
    {
        _client = client;
    }

    public override async Task<bool> RunAsync(
        WorkflowActivityContext context, string orderId)
    {
        // Throws on transient errors - Dapr will retry automatically
        return await _client.ReserveAsync(orderId);
    }
}
```

## Registering and Starting the Workflow

```csharp
// Program.cs
builder.Services.AddDaprWorkflow(options =>
{
    options.RegisterWorkflow<OrderProcessingWorkflow>();
    options.RegisterActivity<ReserveInventoryActivity>();
    options.RegisterActivity<ChargePaymentActivity>();
});
```

Start the workflow using the Dapr workflow client:

```csharp
await daprWorkflowClient.ScheduleNewWorkflowAsync(
    name: nameof(OrderProcessingWorkflow),
    instanceId: orderId,
    input: orderInput);
```

## Handling Non-Retryable Errors

Not all errors should be retried. The Dapr Workflow retry policy retries all exceptions by default, so you cannot prevent retries by throwing a different exception type. Instead, catch business logic errors inside the activity and return a failure value:

```csharp
public override async Task<bool> RunAsync(
    WorkflowActivityContext context, string orderId)
{
    try
    {
        return await _client.ReserveAsync(orderId);
    }
    catch (InsufficientStockException)
    {
        // Return false instead of throwing - Dapr retries all thrown exceptions
        return false;
    }
}
```

## Summary

Dapr Workflow retry policies let you configure per-activity backoff strategies without polluting your business logic. By combining `maxNumberOfAttempts`, `firstRetryInterval`, and `backoffCoefficient`, you get exponential backoff with minimal boilerplate. Since Dapr retries all thrown exceptions, handle non-retryable errors by catching them inside the activity and returning a failure value instead of throwing.
