# How to Implement Sub-Workflow Pattern with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Sub-Workflow, Orchestration, Microservice

Description: Learn how to decompose complex Dapr Workflows into reusable sub-workflows that can be composed, tested, and maintained independently.

---

## What Is a Sub-Workflow?

A sub-workflow is a workflow invoked from within another workflow. Instead of one giant workflow handling every step of a complex process, you break it into smaller workflows that each own a distinct concern. The parent workflow coordinates by calling child workflows just like it calls activities.

This pattern improves reusability - an `OrderFulfillmentWorkflow` can be reused by both a `RetailOrderWorkflow` and a `WholesaleOrderWorkflow`.

## Defining the Sub-Workflow

```csharp
public class PaymentWorkflow : Workflow<PaymentRequest, PaymentResult>
{
    public override async Task<PaymentResult> RunAsync(
        WorkflowContext context, PaymentRequest request)
    {
        var authorized = await context.CallActivityAsync<bool>(
            nameof(AuthorizePaymentActivity), request);

        if (!authorized)
            return new PaymentResult { Success = false, Reason = "Declined" };

        var captured = await context.CallActivityAsync<bool>(
            nameof(CapturePaymentActivity), request);

        return new PaymentResult { Success = captured };
    }
}
```

```csharp
public class ShipmentWorkflow : Workflow<ShipmentRequest, ShipmentResult>
{
    public override async Task<ShipmentResult> RunAsync(
        WorkflowContext context, ShipmentRequest request)
    {
        var label = await context.CallActivityAsync<string>(
            nameof(GenerateShippingLabelActivity), request);

        await context.CallActivityAsync(
            nameof(DispatchToCarrierActivity),
            new DispatchRequest(label, request.Address));

        return new ShipmentResult { TrackingNumber = label };
    }
}
```

## Composing the Parent Workflow

```csharp
public class OrderWorkflow : Workflow<OrderInput, OrderResult>
{
    public override async Task<OrderResult> RunAsync(
        WorkflowContext context, OrderInput input)
    {
        // Reserve inventory first
        await context.CallActivityAsync(
            nameof(ReserveInventoryActivity), input.OrderId);

        // Call payment sub-workflow
        var paymentResult = await context.CallChildWorkflowAsync<PaymentResult>(
            nameof(PaymentWorkflow),
            new PaymentRequest
            {
                OrderId = input.OrderId,
                Amount  = input.TotalAmount,
                CardToken = input.CardToken
            });

        if (!paymentResult.Success)
        {
            await context.CallActivityAsync(
                nameof(ReleaseInventoryActivity), input.OrderId);
            return new OrderResult { Status = "PaymentFailed" };
        }

        // Call shipment sub-workflow
        var shipmentResult = await context.CallChildWorkflowAsync<ShipmentResult>(
            nameof(ShipmentWorkflow),
            new ShipmentRequest
            {
                OrderId = input.OrderId,
                Items   = input.Items,
                Address = input.ShippingAddress
            });

        return new OrderResult
        {
            Status         = "Completed",
            TrackingNumber = shipmentResult.TrackingNumber
        };
    }
}
```

## Passing a Custom Instance ID to a Sub-Workflow

You can provide a deterministic instance ID for the child workflow, which makes it easy to query its status later:

```csharp
var childInstanceId = $"{input.OrderId}-payment";

var paymentResult = await context.CallChildWorkflowAsync<PaymentResult>(
    nameof(PaymentWorkflow),
    new PaymentRequest { OrderId = input.OrderId, Amount = input.TotalAmount },
    new ChildWorkflowTaskOptions { InstanceId = childInstanceId });
```

## Registering All Workflows

```csharp
builder.Services.AddDaprWorkflow(options =>
{
    options.RegisterWorkflow<OrderWorkflow>();
    options.RegisterWorkflow<PaymentWorkflow>();
    options.RegisterWorkflow<ShipmentWorkflow>();
    options.RegisterActivity<ReserveInventoryActivity>();
    options.RegisterActivity<ReleaseInventoryActivity>();
    options.RegisterActivity<AuthorizePaymentActivity>();
    options.RegisterActivity<CapturePaymentActivity>();
    options.RegisterActivity<GenerateShippingLabelActivity>();
    options.RegisterActivity<DispatchToCarrierActivity>();
});
```

## Summary

The sub-workflow pattern lets you decompose large Dapr Workflows into composable, independently testable units. Parent workflows call child workflows using `CallChildWorkflowAsync`, passing typed input and receiving typed output. Assigning deterministic instance IDs to child workflows makes monitoring and troubleshooting straightforward.
