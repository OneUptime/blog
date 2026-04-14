# How to Implement Workflow Compensation Strategies in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Saga Pattern, Compensation, Distributed Transaction, Microservice

Description: Learn how to implement saga-style compensation strategies in Dapr Workflow to roll back distributed transactions when individual steps fail in a microservices system.

---

Distributed transactions across microservices cannot use traditional two-phase commit without creating tight coupling and availability risks. The Saga pattern solves this by breaking a transaction into a sequence of local operations, each paired with a compensating action that undoes the effect if a later step fails. Dapr Workflow makes implementing sagas straightforward: you define the forward steps and their compensating counterparts in code, and the Dapr runtime handles durability and retry semantics.

## Understanding the Saga Pattern in Dapr Workflows

A Dapr Workflow is a durable function that orchestrates activities. If a step fails after several activities have already succeeded, you need to call compensation activities in reverse order to undo the completed steps.

The key insight: Dapr Workflow checkpoints state after each activity completes. When an error occurs, you can catch it in the orchestrator and call previously recorded compensations - even if the orchestrator process was restarted in between.

```text
Forward steps:
  1. Reserve inventory
  2. Charge payment
  3. Create shipment
  
Compensation (on failure at step 3):
  - Refund payment      (undo step 2)
  - Release inventory   (undo step 1)
```

## Setting Up the Dapr Workflow Project

Create a .NET project with the Dapr Workflow SDK:

```bash
dotnet new console -n OrderSagaWorkflow
cd OrderSagaWorkflow
dotnet add package Dapr.Workflow
dotnet add package Microsoft.Extensions.Hosting
```

Define the order data models:

```csharp
// Models.cs
public record OrderRequest(string OrderId, string CustomerId, string ItemId, int Quantity, decimal Amount);
public record InventoryReservation(string ReservationId, string ItemId, int Quantity);
public record PaymentCharge(string ChargeId, string CustomerId, decimal Amount);
public record Shipment(string ShipmentId, string OrderId);
```

## Implementing Forward and Compensation Activities

Each step needs a forward activity and a compensation activity:

```csharp
// Activities/ReserveInventoryActivity.cs
using Dapr.Workflow;

public class ReserveInventoryActivity : WorkflowActivity<OrderRequest, InventoryReservation>
{
    public override async Task<InventoryReservation> RunAsync(WorkflowActivityContext context, OrderRequest input)
    {
        Console.WriteLine($"Reserving {input.Quantity} units of {input.ItemId}");
        // Call inventory service via Dapr service invocation
        await Task.Delay(100); // simulate async call
        return new InventoryReservation(
            ReservationId: Guid.NewGuid().ToString(),
            ItemId: input.ItemId,
            Quantity: input.Quantity
        );
    }
}

public class ReleaseInventoryActivity : WorkflowActivity<InventoryReservation, bool>
{
    public override async Task<bool> RunAsync(WorkflowActivityContext context, InventoryReservation reservation)
    {
        Console.WriteLine($"Releasing reservation {reservation.ReservationId}");
        await Task.Delay(50);
        return true;
    }
}

// Activities/ChargePaymentActivity.cs
public class ChargePaymentActivity : WorkflowActivity<OrderRequest, PaymentCharge>
{
    public override async Task<PaymentCharge> RunAsync(WorkflowActivityContext context, OrderRequest input)
    {
        Console.WriteLine($"Charging {input.Amount} to customer {input.CustomerId}");
        await Task.Delay(200);
        return new PaymentCharge(
            ChargeId: Guid.NewGuid().ToString(),
            CustomerId: input.CustomerId,
            Amount: input.Amount
        );
    }
}

public class RefundPaymentActivity : WorkflowActivity<PaymentCharge, bool>
{
    public override async Task<bool> RunAsync(WorkflowActivityContext context, PaymentCharge charge)
    {
        Console.WriteLine($"Refunding charge {charge.ChargeId}");
        await Task.Delay(150);
        return true;
    }
}

// Activities/CreateShipmentActivity.cs
public class CreateShipmentActivity : WorkflowActivity<OrderRequest, Shipment>
{
    public override async Task<Shipment> RunAsync(WorkflowActivityContext context, OrderRequest input)
    {
        Console.WriteLine($"Creating shipment for order {input.OrderId}");
        // Simulate failure 50% of the time for demo purposes
        if (new Random().Next(2) == 0)
            throw new Exception("Shipping service unavailable");
        return new Shipment(Guid.NewGuid().ToString(), input.OrderId);
    }
}
```

## Implementing the Saga Orchestrator

The orchestrator runs forward steps and tracks completed compensations:

```csharp
// Workflows/OrderSagaWorkflow.cs
using Dapr.Workflow;

public class OrderSagaOrchestrator : Workflow<OrderRequest, string>
{
    public override async Task<string> RunAsync(WorkflowContext context, OrderRequest order)
    {
        // Track compensations in reverse order
        var compensations = new Stack<Func<Task>>();

        try
        {
            // Step 1: Reserve inventory
            var reservation = await context.CallActivityAsync<InventoryReservation>(
                nameof(ReserveInventoryActivity), order);
            
            // Register compensation for step 1
            compensations.Push(async () =>
                await context.CallActivityAsync<bool>(
                    nameof(ReleaseInventoryActivity), reservation));

            // Step 2: Charge payment
            var charge = await context.CallActivityAsync<PaymentCharge>(
                nameof(ChargePaymentActivity), order);
            
            // Register compensation for step 2
            compensations.Push(async () =>
                await context.CallActivityAsync<bool>(
                    nameof(RefundPaymentActivity), charge));

            // Step 3: Create shipment (may fail)
            var shipment = await context.CallActivityAsync<Shipment>(
                nameof(CreateShipmentActivity), order);

            return $"Order {order.OrderId} completed. Shipment: {shipment.ShipmentId}";
        }
        catch (Exception ex)
        {
            context.SetCustomStatus($"Order failed: {ex.Message}. Running compensations...");
            
            // Execute compensations in reverse order (LIFO)
            while (compensations.TryPop(out var compensate))
            {
                try
                {
                    await compensate();
                }
                catch (Exception compEx)
                {
                    // Log compensation failure but continue with remaining compensations
                    context.SetCustomStatus($"Compensation failed: {compEx.Message}");
                }
            }

            return $"Order {order.OrderId} rolled back due to: {ex.Message}";
        }
    }
}
```

## Registering and Starting the Workflow

```csharp
// Program.cs
using Dapr.Workflow;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;

var builder = Host.CreateDefaultBuilder(args);

builder.ConfigureServices(services =>
{
    services.AddDaprWorkflow(options =>
    {
        options.RegisterWorkflow<OrderSagaOrchestrator>();
        options.RegisterActivity<ReserveInventoryActivity>();
        options.RegisterActivity<ReleaseInventoryActivity>();
        options.RegisterActivity<ChargePaymentActivity>();
        options.RegisterActivity<RefundPaymentActivity>();
        options.RegisterActivity<CreateShipmentActivity>();
    });
});

var host = builder.Build();

// Start the host so the workflow engine begins processing
await host.StartAsync();

var client = host.Services.GetRequiredService<DaprWorkflowClient>();

var orderId = Guid.NewGuid().ToString("N")[..8];
var order = new OrderRequest(orderId, "cust-42", "item-99", 2, 49.99m);

await client.ScheduleNewWorkflowAsync(
    name: nameof(OrderSagaOrchestrator),
    instanceId: orderId,
    input: order);

Console.WriteLine($"Workflow started: {orderId}");

// Poll until completion
while (true)
{
    var state = await client.GetWorkflowStateAsync(orderId, getInputsAndOutputs: true);
    Console.WriteLine($"Status: {state?.RuntimeStatus} | {state?.ReadCustomStatusAs<string>()}");
    
    if (state?.IsWorkflowCompleted == true)
    {
        Console.WriteLine($"Result: {state.ReadOutputAs<string>()}");
        break;
    }
    await Task.Delay(500);
}

await host.StopAsync();
```

## Running with the Dapr Sidecar

```bash
# Run the application with Dapr
dapr run \
  --app-id order-saga \
  --dapr-http-port 3500 \
  --app-port 5000 \
  --resources-path ./components \
  -- dotnet run
```

Create a minimal state store component for workflow state (required):

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: workflowstatestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: actorStateStore
    value: "true"
```

## Summary

Implementing workflow compensation strategies in Dapr follows the Saga pattern: execute each forward step, register its compensating action on a stack, and if any step fails, drain the stack in LIFO order to roll back completed work. Dapr Workflow's durable execution model ensures that even if the orchestrator process crashes mid-compensation, the workflow resumes and completes all registered compensations. This approach keeps microservices loosely coupled while maintaining eventual consistency across distributed operations.
