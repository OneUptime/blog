# How to Use Dapr Workflow with Sub-Orchestrations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Sub-Orchestration, Orchestration, Microservice

Description: Learn how to use Dapr Workflow sub-orchestrations to decompose complex workflows into reusable, independently versioned child workflows.

---

## Overview

As workflows grow in complexity, it becomes useful to split them into smaller, reusable units. Dapr Workflow supports sub-orchestrations - child workflows that can be called from a parent workflow just like activities. Sub-orchestrations are independently durable, can run in parallel, and can be reused across multiple parent workflows.

## When to Use Sub-Orchestrations

Sub-orchestrations are a good fit when:

- A workflow step is complex enough to warrant its own error handling and retries
- The same workflow logic needs to be reused across multiple parent workflows
- You want to run multiple workflow sequences in parallel using fan-out
- A workflow step needs to manage its own long-running state

## Defining a Sub-Workflow in .NET

Define the child workflow the same way as any other workflow:

```csharp
using Dapr.Workflow;

public class FulfillmentWorkflow : Workflow<FulfillmentRequest, FulfillmentResult>
{
    public override async Task<FulfillmentResult> RunAsync(
        WorkflowContext context,
        FulfillmentRequest request)
    {
        await context.CallActivityAsync(nameof(ReserveInventoryActivity), request);
        await context.CallActivityAsync(nameof(PackageItemsActivity), request);
        await context.CallActivityAsync(nameof(ScheduleShipmentActivity), request);

        return new FulfillmentResult { TrackingNumber = context.NewGuid().ToString() };
    }
}
```

## Calling a Sub-Workflow from a Parent

Use `CallChildWorkflowAsync` to invoke the child workflow:

```csharp
public class OrderWorkflow : Workflow<OrderRequest, OrderResult>
{
    public override async Task<OrderResult> RunAsync(
        WorkflowContext context,
        OrderRequest order)
    {
        // Run payment processing
        var payment = await context.CallActivityAsync<PaymentResult>(
            nameof(ProcessPaymentActivity), order);

        if (!payment.Success)
            return new OrderResult { Success = false, Error = "Payment failed" };

        // Delegate fulfillment to a child workflow
        var fulfillment = await context.CallChildWorkflowAsync<FulfillmentResult>(
            nameof(FulfillmentWorkflow),
            new FulfillmentRequest
            {
                OrderId = order.OrderId,
                Items = order.Items,
                ShippingAddress = order.ShippingAddress
            }
        );

        return new OrderResult
        {
            Success = true,
            OrderId = order.OrderId,
            TrackingNumber = fulfillment.TrackingNumber
        };
    }
}
```

## Running Sub-Workflows in Parallel (Fan-Out)

Use `Task.WhenAll` to run multiple child workflows concurrently:

```csharp
public class BatchOrderWorkflow : Workflow<BatchOrderRequest, BatchOrderResult>
{
    public override async Task<BatchOrderResult> RunAsync(
        WorkflowContext context,
        BatchOrderRequest batch)
    {
        var tasks = batch.Orders.Select(order =>
            context.CallChildWorkflowAsync<OrderResult>(
                nameof(OrderWorkflow),
                order,
                new ChildWorkflowTaskOptions
                {
                    InstanceId = $"order-{order.OrderId}"
                }
            )
        );

        var results = await Task.WhenAll(tasks);

        return new BatchOrderResult
        {
            TotalOrders = results.Length,
            SuccessCount = results.Count(r => r.Success),
            FailureCount = results.Count(r => !r.Success)
        };
    }
}
```

## Using Sub-Orchestrations in Python

```python
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowContext

def fulfillment_workflow(ctx: DaprWorkflowContext, request: dict):
    yield ctx.call_activity(reserve_inventory, input=request)
    yield ctx.call_activity(package_items, input=request)
    yield ctx.call_activity(schedule_shipment, input=request)
    return {'trackingNumber': ctx.instance_id + '-track'}


def order_workflow(ctx: DaprWorkflowContext, order: dict):
    payment = yield ctx.call_activity(process_payment, input=order)

    if not payment['success']:
        return {'success': False, 'error': 'Payment failed'}

    # Call child workflow
    fulfillment = yield ctx.call_child_workflow(
        workflow=fulfillment_workflow,
        input={
            'orderId': order['orderId'],
            'items': order['items'],
            'address': order['shippingAddress']
        },
        instance_id=f"fulfillment-{order['orderId']}"
    )

    return {
        'success': True,
        'orderId': order['orderId'],
        'trackingNumber': fulfillment['trackingNumber']
    }
```

## Assigning Explicit Instance IDs to Child Workflows

Providing a predictable instance ID lets you query the child workflow independently:

```csharp
var fulfillment = await context.CallChildWorkflowAsync<FulfillmentResult>(
    nameof(FulfillmentWorkflow),
    request,
    new ChildWorkflowTaskOptions
    {
        InstanceId = $"fulfillment-{order.OrderId}",
        RetryPolicy = new WorkflowRetryPolicy(
            maxNumberOfAttempts: 3,
            firstRetryInterval: TimeSpan.FromSeconds(5))
    }
);
```

Then query it directly:

```bash
curl http://localhost:3500/v1.0/workflows/dapr/fulfillment-order-123
```

## Registering Sub-Workflows

Sub-workflows must be registered with the workflow runtime:

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprWorkflow(options =>
{
    options.RegisterWorkflow<OrderWorkflow>();
    options.RegisterWorkflow<FulfillmentWorkflow>();  // Register child workflow
    options.RegisterWorkflow<BatchOrderWorkflow>();
    options.RegisterActivity<ProcessPaymentActivity>();
    options.RegisterActivity<ReserveInventoryActivity>();
    options.RegisterActivity<PackageItemsActivity>();
    options.RegisterActivity<ScheduleShipmentActivity>();
});
```

## Error Propagation from Child Workflows

If a child workflow fails, the exception propagates to the parent where you can catch and handle it:

```csharp
try
{
    var fulfillment = await context.CallChildWorkflowAsync<FulfillmentResult>(
        nameof(FulfillmentWorkflow), request);
}
catch (WorkflowTaskFailedException ex)
{
    // Child workflow failed - compensate
    await context.CallActivityAsync(nameof(RefundPaymentActivity), order);
    return new OrderResult { Success = false, Error = ex.FailureDetails.ErrorMessage };
}
```

## Summary

Dapr Workflow sub-orchestrations let you decompose complex workflows into smaller, reusable child workflows that maintain their own durable execution state. Parent workflows call child workflows using `CallChildWorkflowAsync`, can run multiple children in parallel with `Task.WhenAll`, and receive typed results or exceptions from their children. All sub-workflows must be registered with the workflow runtime and are independently queryable through the Dapr management API using their instance IDs.
