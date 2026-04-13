# How to Implement Workflow Activities in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, .NET, Activity, C#

Description: Implement Dapr workflow activities in .NET using the WorkflowActivityContext, covering input/output types, dependency injection, error handling, and retry policies.

---

## Overview

In Dapr .NET workflows, activities are the units of work that perform side effects - calling external APIs, reading from databases, sending notifications. Activities are isolated from the workflow orchestrator, can run on different replicas, and support dependency injection via the standard .NET DI container.

## Activity Basics

Every activity inherits from `WorkflowActivity<TInput, TOutput>`:

```csharp
using Dapr.Workflow;

// Input/output records
public record OrderInput(string OrderId, decimal Amount);
public record PaymentResult(string PaymentId, string Status);

// Activity implementation
public class ProcessPaymentActivity : WorkflowActivity<OrderInput, PaymentResult>
{
    private readonly IPaymentService _paymentService;
    private readonly ILogger<ProcessPaymentActivity> _logger;

    public ProcessPaymentActivity(
        IPaymentService paymentService,
        ILogger<ProcessPaymentActivity> logger)
    {
        _paymentService = paymentService;
        _logger = logger;
    }

    public override async Task<PaymentResult> RunAsync(
        WorkflowActivityContext context,
        OrderInput input)
    {
        _logger.LogInformation(
            "Processing payment for order {OrderId}, amount {Amount}",
            input.OrderId, input.Amount);

        var result = await _paymentService.ChargeAsync(input.OrderId, input.Amount);

        return new PaymentResult(result.TransactionId, result.Status);
    }
}
```

## Registering Activities with DI

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprWorkflow(options =>
{
    options.RegisterWorkflow<OrderFulfillmentWorkflow>();
    options.RegisterActivity<ProcessPaymentActivity>();
    options.RegisterActivity<ReserveInventoryActivity>();
    options.RegisterActivity<SendConfirmationActivity>();
});

// Register your service dependencies
builder.Services.AddHttpClient<IPaymentService, PaymentService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IEmailService, EmailService>();

var app = builder.Build();
app.UseRouting();
app.MapSubscribeHandler();
await app.RunAsync();
```

## Calling Activities from a Workflow

```csharp
public class OrderFulfillmentWorkflow : Workflow<string, OrderResult>
{
    public override async Task<OrderResult> RunAsync(
        WorkflowContext context,
        string orderId)
    {
        // Call activity - returns PaymentResult
        var payment = await context.CallActivityAsync<PaymentResult>(
            nameof(ProcessPaymentActivity),
            new OrderInput(orderId, 99.99m));

        if (payment.Status != "success")
        {
            throw new InvalidOperationException(
                $"Payment failed for order {orderId}");
        }

        var inventory = await context.CallActivityAsync<InventoryResult>(
            nameof(ReserveInventoryActivity),
            new OrderInput(orderId, 99.99m));

        await context.CallActivityAsync(
            nameof(SendConfirmationActivity),
            new ConfirmationInput(orderId, payment.PaymentId));

        return new OrderResult(orderId, payment.PaymentId, inventory.ReservationId);
    }
}
```

## Activity Retry Policies

```csharp
var retryOptions = new WorkflowTaskOptions
{
    RetryPolicy = new WorkflowRetryPolicy(
        maxNumberOfAttempts: 3,
        firstRetryInterval: TimeSpan.FromSeconds(5),
        backoffCoefficient: 2.0,
        maxRetryInterval: TimeSpan.FromSeconds(60))
};

var payment = await context.CallActivityAsync<PaymentResult>(
    nameof(ProcessPaymentActivity),
    new OrderInput(orderId, 99.99m),
    retryOptions);
```

## Handling Transient vs. Permanent Failures

```csharp
public override async Task<PaymentResult> RunAsync(
    WorkflowActivityContext context,
    OrderInput input)
{
    try
    {
        return await _paymentService.ChargeAsync(input.OrderId, input.Amount);
    }
    catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.ServiceUnavailable)
    {
        // Retryable - throw to trigger retry policy
        throw;
    }
    catch (InvalidOperationException ex)
    {
        // Permanent failure - wrap with context for clearer error diagnostics
        // Note: Dapr retry policy still retries all thrown exceptions regardless of type
        throw new ApplicationException($"Payment permanently rejected: {ex.Message}", ex);
    }
}
```

## Unit Testing Activities

```csharp
[Fact]
public async Task ProcessPaymentActivity_SuccessfulCharge_ReturnsPaymentId()
{
    var mockPaymentService = new Mock<IPaymentService>();
    mockPaymentService
        .Setup(s => s.ChargeAsync("order-1", 99.99m))
        .ReturnsAsync(new ChargeResult("pay-123", "success"));

    var activity = new ProcessPaymentActivity(
        mockPaymentService.Object,
        Mock.Of<ILogger<ProcessPaymentActivity>>());

    var result = await activity.RunAsync(
        Mock.Of<WorkflowActivityContext>(),
        new OrderInput("order-1", 99.99m));

    Assert.Equal("pay-123", result.PaymentId);
    Assert.Equal("success", result.Status);
}
```

## Summary

Dapr workflow activities in .NET are classes that inherit `WorkflowActivity<TInput, TOutput>` and receive dependencies via standard .NET DI. Register activities using `AddDaprWorkflow` in `Program.cs`, then call them from workflow orchestrators with `CallActivityAsync`. Apply retry policies at the call site in the workflow, and wrap permanent failures with descriptive context to aid diagnostics in the workflow orchestrator. Activities are unit testable in isolation without a running Dapr runtime.
