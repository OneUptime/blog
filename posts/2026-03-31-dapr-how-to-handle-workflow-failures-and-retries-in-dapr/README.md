# How to Handle Workflow Failures and Retries in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Error Handling, Retries, Resilience

Description: Learn how to handle activity failures and configure retry policies in Dapr Workflow to build resilient orchestrations that recover from transient errors automatically.

---

## Overview

Distributed workflows are inherently prone to partial failures - network timeouts, downstream service outages, and transient errors are all common. Dapr Workflow provides built-in mechanisms for retry policies, error handling, and compensation so your workflow activities can recover from failures without losing progress.

## How Dapr Workflow Handles Failures

Dapr Workflow activities run as durable functions. If an activity fails, the workflow engine can retry it based on the retry policy you configure. Failed activities do not lose the workflow's progress because Dapr persists the execution history to a state store.

## Configuring Retry Policies in .NET

Define a `WorkflowTaskOptions` with a retry policy when calling an activity:

```csharp
using Dapr.Workflow;

public class OrderWorkflow : Workflow<OrderRequest, OrderResult>
{
    public override async Task<OrderResult> RunAsync(WorkflowContext context, OrderRequest order)
    {
        var retryOptions = new WorkflowTaskOptions
        {
            RetryPolicy = new WorkflowRetryPolicy(
                maxNumberOfAttempts: 5,
                firstRetryInterval: TimeSpan.FromSeconds(2),
                backoffCoefficient: 2.0,
                maxRetryInterval: TimeSpan.FromMinutes(1)
            )
        };

        try
        {
            var inventoryResult = await context.CallActivityAsync<InventoryResult>(
                nameof(CheckInventoryActivity),
                order,
                retryOptions
            );

            var paymentResult = await context.CallActivityAsync<PaymentResult>(
                nameof(ProcessPaymentActivity),
                order,
                retryOptions
            );

            return new OrderResult { Success = true, OrderId = paymentResult.OrderId };
        }
        catch (WorkflowTaskFailedException ex)
        {
            context.SetCustomStatus($"Workflow failed: {ex.FailureDetails.ErrorMessage}");
            return new OrderResult { Success = false, Error = ex.FailureDetails.ErrorMessage };
        }
    }
}
```

## Configuring Retry Policies in Python

```python
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowContext, WorkflowActivityContext, RetryPolicy
from datetime import timedelta

def order_workflow(ctx: DaprWorkflowContext, order: dict):
    retry_policy = RetryPolicy(
        first_retry_interval=timedelta(seconds=2),
        max_number_of_attempts=5,
        backoff_coefficient=2.0,
        max_retry_interval=timedelta(minutes=1),
    )

    try:
        inventory = yield ctx.call_activity(
            check_inventory,
            input=order,
            retry_policy=retry_policy
        )

        payment = yield ctx.call_activity(
            process_payment,
            input=order,
            retry_policy=retry_policy
        )

        return {'success': True, 'orderId': payment['orderId']}
    except Exception as e:
        ctx.set_custom_status(f'Workflow failed: {str(e)}')
        return {'success': False, 'error': str(e)}
```

## Writing Activities with Proper Error Handling

Activities should raise exceptions for transient errors and return error results for permanent failures:

```csharp
public class ProcessPaymentActivity : WorkflowActivity<OrderRequest, PaymentResult>
{
    private readonly IPaymentService _paymentService;

    public ProcessPaymentActivity(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    public override async Task<PaymentResult> RunAsync(
        WorkflowActivityContext context,
        OrderRequest order)
    {
        try
        {
            var result = await _paymentService.ChargeAsync(order.CustomerId, order.Amount);
            return new PaymentResult { Success = true, TransactionId = result.Id };
        }
        catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.ServiceUnavailable)
        {
            // Transient - throw to trigger retry
            throw new Exception($"Payment service unavailable: {ex.Message}");
        }
        catch (PaymentDeclinedException ex)
        {
            // Permanent failure - return error result instead of throwing
            return new PaymentResult { Success = false, DeclineReason = ex.Reason };
        }
    }
}
```

## Implementing Compensation Logic on Failure

Use try-catch with compensation activities to undo completed steps when a later step fails:

```csharp
public class OrderWorkflow : Workflow<OrderRequest, OrderResult>
{
    public override async Task<OrderResult> RunAsync(WorkflowContext context, OrderRequest order)
    {
        bool inventoryReserved = false;
        bool paymentCharged = false;

        try
        {
            await context.CallActivityAsync(nameof(ReserveInventoryActivity), order);
            inventoryReserved = true;

            await context.CallActivityAsync(nameof(ProcessPaymentActivity), order);
            paymentCharged = true;

            await context.CallActivityAsync(nameof(ShipOrderActivity), order);
            return new OrderResult { Success = true };
        }
        catch (Exception ex)
        {
            // Compensate in reverse order
            if (paymentCharged)
                await context.CallActivityAsync(nameof(RefundPaymentActivity), order);
            if (inventoryReserved)
                await context.CallActivityAsync(nameof(ReleaseInventoryActivity), order);

            return new OrderResult { Success = false, Error = ex.Message };
        }
    }
}
```

## Setting a Workflow Timeout

Use `CreateTimer` combined with task completion to implement workflow-level timeouts:

```csharp
public override async Task<OrderResult> RunAsync(WorkflowContext context, OrderRequest order)
{
    var timeout = context.CreateTimer(TimeSpan.FromHours(1));
    var work = context.CallActivityAsync<OrderResult>(nameof(ProcessOrderActivity), order);

    var winner = await Task.WhenAny(work, timeout);
    if (winner == timeout)
    {
        context.SetCustomStatus("Workflow timed out");
        return new OrderResult { Success = false, Error = "Timeout" };
    }

    return await work;
}
```

## Inspecting Failures via the Dapr CLI

Check the status of a failed workflow instance:

```bash
dapr workflow history abc123 --app-id orderservice
```

Example output showing a failed instance:

```text
Workflow runtime status: FAILED
Created at: 2026-03-31T10:00:00Z
Last updated: 2026-03-31T10:05:00Z
Input: {"customerId": "c1", "amount": 99.99}
Output: {"success": false, "error": "Payment service unavailable"}
```

## Summary

Dapr Workflow handles failures and retries through configurable retry policies on individual activity calls, allowing exponential backoff and maximum attempt limits. Activities should throw exceptions for transient failures (to trigger retries) and return error results for permanent failures. For complex workflows, implement compensation logic to undo previously completed steps when a later step fails permanently, ensuring your system stays in a consistent state.
