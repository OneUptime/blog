# How to Implement Multi-Service Orchestration Workflow with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Orchestration, Microservice, Service Invocation

Description: Learn how to build a Dapr Workflow that orchestrates calls across multiple independent microservices with error handling, retries, and compensation logic.

---

## Orchestration vs. Choreography

In choreography, services react to events independently. In orchestration, a central coordinator - the workflow - directs each service in sequence or in parallel. Orchestration is easier to reason about when business logic spans many services and the order of operations matters.

Dapr Workflow is the orchestration engine. It calls services via Dapr Service Invocation, keeping all inter-service communication through the Dapr sidecar.

## Designing the Orchestration

An e-commerce checkout involves five services: Catalog, Inventory, Pricing, Payment, and Fulfillment. The workflow coordinates them.

```csharp
public class CheckoutOrchestrationWorkflow
    : Workflow<CheckoutInput, CheckoutResult>
{
    public override async Task<CheckoutResult> RunAsync(
        WorkflowContext context, CheckoutInput input)
    {
        // 1. Validate cart items against catalog
        var catalogValid = await context.CallActivityAsync<bool>(
            nameof(ValidateCatalogActivity), input.CartItems);

        if (!catalogValid)
            return new CheckoutResult { Status = "InvalidItems" };

        // 2. Reserve inventory and calculate final price in parallel
        var inventoryTask = context.CallActivityAsync<InventoryReservation>(
            nameof(ReserveInventoryActivity), input.CartItems);

        var pricingTask = context.CallActivityAsync<PricingBreakdown>(
            nameof(CalculatePricingActivity),
            new PricingRequest(input.CartItems, input.PromoCode));

        await Task.WhenAll(inventoryTask, pricingTask);

        var reservation = await inventoryTask;
        var pricing     = await pricingTask;

        // 3. Process payment
        var payment = await context.CallActivityAsync<PaymentResult>(
            nameof(ProcessPaymentActivity),
            new PaymentRequest(input.PaymentMethod, pricing.TotalAmount));

        if (!payment.Success)
        {
            await context.CallActivityAsync(
                nameof(ReleaseInventoryActivity), reservation.ReservationId);
            return new CheckoutResult { Status = "PaymentFailed" };
        }

        // 4. Create fulfillment order
        var fulfillment = await context.CallActivityAsync<FulfillmentOrder>(
            nameof(CreateFulfillmentActivity),
            new FulfillmentRequest(reservation, input.ShippingAddress));

        // 5. Send confirmation
        await context.CallActivityAsync(
            nameof(SendOrderConfirmationActivity),
            new ConfirmationData(input.CustomerEmail, fulfillment.OrderNumber));

        return new CheckoutResult
        {
            Status      = "Completed",
            OrderNumber = fulfillment.OrderNumber,
            Total       = pricing.TotalAmount
        };
    }
}
```

## Activity Using Dapr Service Invocation

```csharp
public class ReserveInventoryActivity
    : WorkflowActivity<List<CartItem>, InventoryReservation>
{
    private readonly DaprClient _daprClient;

    public ReserveInventoryActivity(DaprClient daprClient)
    {
        _daprClient = daprClient;
    }

    public override async Task<InventoryReservation> RunAsync(
        WorkflowActivityContext context, List<CartItem> items)
    {
        return await _daprClient.InvokeMethodAsync<List<CartItem>, InventoryReservation>(
            httpMethod: HttpMethod.Post,
            appId: "inventory-service",
            methodName: "reservations",
            data: items);
    }
}
```

## Applying Retry Policies per Activity

```csharp
var retryPolicy = new WorkflowTaskOptions
{
    RetryPolicy = new WorkflowRetryPolicy(
        maxNumberOfAttempts: 3,
        firstRetryInterval: TimeSpan.FromSeconds(2),
        backoffCoefficient: 1.5)
};

var payment = await context.CallActivityAsync<PaymentResult>(
    nameof(ProcessPaymentActivity),
    new PaymentRequest(input.PaymentMethod, pricing.TotalAmount),
    retryPolicy);
```

## Querying Workflow Status

```bash
curl http://localhost:3500/v1.0/workflows/dapr/checkout-001
```

```json
{
  "instanceID": "checkout-001",
  "workflowName": "CheckoutOrchestrationWorkflow",
  "createdAt": "2026-03-31T10:00:00Z",
  "lastUpdatedAt": "2026-03-31T10:00:30Z",
  "runtimeStatus": "COMPLETED",
  "properties": {
    "dapr.workflow.custom_status": "",
    "dapr.workflow.input": "{\"cartItems\":[...],\"paymentMethod\":\"card\"}",
    "dapr.workflow.output": "{\"status\":\"Completed\",\"orderNumber\":\"ORD-20260331-001\",\"total\":149.99}"
  }
}
```

## Summary

Dapr Workflow provides a clear orchestration model for multi-service business processes. Each service interaction is encapsulated in an activity that uses Dapr Service Invocation for resilient, sidecar-managed communication. Parallel steps are handled with `Task.WhenAll`, and per-activity retry policies protect against transient failures without coupling services to each other.
