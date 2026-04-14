# How to Build Dapr Workflows with .NET SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, .NET, SDK, Durable Execution, Microservice, C#

Description: Learn how to build reliable, long-running workflows using the Dapr Workflow .NET SDK, covering orchestration, activities, error handling, and fan-out/fan-in patterns.

---

Dapr Workflow provides durable execution for long-running processes: orchestrators checkpoint state after each activity, so workflows survive process restarts and resume exactly where they left off. The .NET SDK offers a clean, async/await programming model that makes workflow code look like ordinary C# while the Dapr runtime handles all durability concerns. This guide covers building production-ready workflows with the .NET SDK from simple sequential flows to advanced fan-out/fan-in patterns.

## Project Setup

```bash
dotnet new console -n OrderProcessingWorkflow
cd OrderProcessingWorkflow
dotnet add package Dapr.Workflow
dotnet add package Microsoft.Extensions.Hosting
dotnet add package Microsoft.Extensions.Http
```

Define your models:

```csharp
// Models.cs
public record OrderRequest(
    string OrderId,
    string CustomerId,
    List<OrderItem> Items,
    ShippingAddress Address
);

public record OrderItem(string Sku, int Quantity, decimal UnitPrice);
public record ShippingAddress(string Street, string City, string Country, string PostalCode);
public record PaymentResult(bool Success, string TransactionId, string? ErrorMessage);
public record ShipmentResult(string ShipmentId, string TrackingNumber, DateTime EstimatedDelivery);
public record InventoryCheckResult(string Sku, bool Available, int CurrentStock);
```

## Implementing Activities

Activities are the individual units of work. Each activity is retried independently if it fails:

```csharp
// Activities/ValidateOrderActivity.cs
using Dapr.Workflow;
using Microsoft.Extensions.Logging;

public class ValidateOrderActivity : WorkflowActivity<OrderRequest, bool>
{
    private readonly ILogger<ValidateOrderActivity> _logger;

    public ValidateOrderActivity(ILogger<ValidateOrderActivity> logger)
    {
        _logger = logger;
    }

    public override async Task<bool> RunAsync(WorkflowActivityContext context, OrderRequest order)
    {
        _logger.LogInformation("Validating order {OrderId}", order.OrderId);
        
        if (string.IsNullOrEmpty(order.CustomerId))
            throw new ArgumentException("CustomerId is required");
        if (!order.Items.Any())
            throw new ArgumentException("Order must have at least one item");
        if (order.Items.Any(i => i.Quantity <= 0))
            throw new ArgumentException("All item quantities must be positive");
        
        await Task.Delay(50); // Simulate validation API call
        return true;
    }
}

// Activities/CheckInventoryActivity.cs
public class CheckInventoryActivity : WorkflowActivity<OrderItem, InventoryCheckResult>
{
    private readonly HttpClient _httpClient;

    public CheckInventoryActivity(IHttpClientFactory factory)
    {
        _httpClient = factory.CreateClient("inventory");
    }

    public override async Task<InventoryCheckResult> RunAsync(
        WorkflowActivityContext context, OrderItem item)
    {
        // Call inventory service via Dapr service invocation
        var resp = await _httpClient.GetAsync(
            $"http://localhost:3500/v1.0/invoke/inventory-service/method/check/{item.Sku}");
        
        if (resp.IsSuccessStatusCode)
        {
            var result = await resp.Content.ReadFromJsonAsync<InventoryCheckResult>();
            return result ?? new InventoryCheckResult(item.Sku, false, 0);
        }
        return new InventoryCheckResult(item.Sku, false, 0);
    }
}

// Activities/ProcessPaymentActivity.cs
public class ProcessPaymentActivity : WorkflowActivity<OrderRequest, PaymentResult>
{
    public override async Task<PaymentResult> RunAsync(
        WorkflowActivityContext context, OrderRequest order)
    {
        decimal total = order.Items.Sum(i => i.Quantity * i.UnitPrice);
        
        // Idempotency key prevents duplicate charges on retry
        var idempotencyKey = $"order-{order.OrderId}-payment";
        
        // Simulate payment API call (use idempotencyKey in real impl)
        await Task.Delay(200);
        
        return new PaymentResult(
            Success: true,
            TransactionId: $"txn-{Guid.NewGuid():N}",
            ErrorMessage: null
        );
    }
}

// Activities/CreateShipmentActivity.cs
public class CreateShipmentActivity : WorkflowActivity<OrderRequest, ShipmentResult>
{
    public override async Task<ShipmentResult> RunAsync(
        WorkflowActivityContext context, OrderRequest order)
    {
        await Task.Delay(300);
        return new ShipmentResult(
            ShipmentId: $"shp-{Guid.NewGuid():N}",
            TrackingNumber: $"TRACK{Random.Shared.Next(100000, 999999)}",
            EstimatedDelivery: DateTime.UtcNow.AddDays(3)
        );
    }
}
```

## Building the Orchestrator

```csharp
// Workflows/OrderProcessingWorkflow.cs
using Dapr.Workflow;
using Microsoft.Extensions.Logging;

public class OrderProcessingOrchestrator : Workflow<OrderRequest, string>
{
    public override async Task<string> RunAsync(WorkflowContext context, OrderRequest order)
    {
        var logger = context.CreateReplaySafeLogger<OrderProcessingOrchestrator>();
        logger.LogInformation("Starting order processing: {OrderId}", order.OrderId);

        // Step 1: Validate the order
        await context.CallActivityAsync<bool>(
            nameof(ValidateOrderActivity), order,
            new WorkflowTaskOptions
            {
                RetryPolicy = new WorkflowRetryPolicy(
                    maxNumberOfAttempts: 3,
                    firstRetryInterval: TimeSpan.FromSeconds(1))
            });

        // Step 2: Fan-out inventory checks for all items in parallel
        context.SetCustomStatus("Checking inventory...");
        var inventoryTasks = order.Items
            .Select(item => context.CallActivityAsync<InventoryCheckResult>(
                nameof(CheckInventoryActivity), item))
            .ToList();

        var inventoryResults = await Task.WhenAll(inventoryTasks);

        // Check all items are available
        var unavailable = inventoryResults.Where(r => !r.Available).ToList();
        if (unavailable.Any())
        {
            var skus = string.Join(", ", unavailable.Select(r => r.Sku));
            return $"Order {order.OrderId} failed: items unavailable: {skus}";
        }

        // Step 3: Process payment
        context.SetCustomStatus("Processing payment...");
        PaymentResult payment;
        try
        {
            payment = await context.CallActivityAsync<PaymentResult>(
                nameof(ProcessPaymentActivity), order,
                new WorkflowTaskOptions
                {
                    RetryPolicy = new WorkflowRetryPolicy(
                        maxNumberOfAttempts: 3,
                        firstRetryInterval: TimeSpan.FromSeconds(2),
                        backoffCoefficient: 2.0)
                });
        }
        catch (WorkflowTaskFailedException ex)
        {
            logger.LogError("Payment failed for order {OrderId}: {Error}",
                order.OrderId, ex.Message);
            return $"Order {order.OrderId} failed: payment error";
        }

        if (!payment.Success)
        {
            return $"Order {order.OrderId} failed: {payment.ErrorMessage}";
        }

        // Step 4: Create shipment
        context.SetCustomStatus("Creating shipment...");
        var shipment = await context.CallActivityAsync<ShipmentResult>(
            nameof(CreateShipmentActivity), order);

        context.SetCustomStatus("Completed");
        logger.LogInformation(
            "Order {OrderId} completed. Tracking: {TrackingNumber}",
            order.OrderId, shipment.TrackingNumber);

        return $"Order {order.OrderId} fulfilled. " +
               $"Transaction: {payment.TransactionId}. " +
               $"Tracking: {shipment.TrackingNumber}. " +
               $"ETA: {shipment.EstimatedDelivery:d}";
    }
}
```

## Registering and Running the Workflow

```csharp
// Program.cs
using Dapr.Workflow;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = Host.CreateDefaultBuilder(args);
builder.ConfigureServices(services =>
{
    services.AddHttpClient();
    
    services.AddDaprWorkflow(options =>
    {
        // Register orchestrators
        options.RegisterWorkflow<OrderProcessingOrchestrator>();
        
        // Register activities
        options.RegisterActivity<ValidateOrderActivity>();
        options.RegisterActivity<CheckInventoryActivity>();
        options.RegisterActivity<ProcessPaymentActivity>();
        options.RegisterActivity<CreateShipmentActivity>();
    });
});

var host = builder.Build();

// Start the workflow engine
await host.StartAsync();

// Schedule a workflow
var client = host.Services.GetRequiredService<DaprWorkflowClient>();

var orderId = "ord-" + Guid.NewGuid().ToString("N")[..8];
var order = new OrderRequest(
    OrderId: orderId,
    CustomerId: "cust-42",
    Items: new List<OrderItem>
    {
        new("sku-widget-001", 2, 29.99m),
        new("sku-gadget-002", 1, 89.99m)
    },
    Address: new("123 Main St", "Seattle", "US", "98101")
);

await client.ScheduleNewWorkflowAsync(
    name: nameof(OrderProcessingOrchestrator),
    instanceId: orderId,
    input: order);

Console.WriteLine($"Workflow started: {orderId}");

// Poll until completion
while (true)
{
    var state = await client.GetWorkflowStateAsync(orderId, getInputsAndOutputs: true);
    
    Console.WriteLine(
        $"[{DateTime.Now:HH:mm:ss}] Status: {state.RuntimeStatus} | " +
        $"{state.ReadCustomStatusAs<string>()}");
    
    if (state.IsWorkflowCompleted)
    {
        var result = state.ReadOutputAs<string>();
        Console.WriteLine($"\nFinal result: {result}");
        break;
    }
    
    await Task.Delay(1000);
}

await host.StopAsync();
```

## Running with Dapr

```bash
# Create a components directory with state store for workflow state
mkdir -p components

cat > components/statestore.yaml << 'EOF'
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
EOF

# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Run the workflow application
dapr run \
  --app-id order-workflow \
  --dapr-http-port 3500 \
  --app-port 5000 \
  --resources-path ./components \
  -- dotnet run
```

## Querying Workflow State via HTTP

```bash
# Get workflow instance state
curl "http://localhost:3500/v1.0/workflows/dapr/${ORDER_ID}"

# Terminate a workflow
curl -X POST \
  "http://localhost:3500/v1.0/workflows/dapr/${ORDER_ID}/terminate"

# Pause a workflow
curl -X POST \
  "http://localhost:3500/v1.0/workflows/dapr/${ORDER_ID}/pause"

# Resume a paused workflow
curl -X POST \
  "http://localhost:3500/v1.0/workflows/dapr/${ORDER_ID}/resume"
```

## Summary

The Dapr Workflow .NET SDK provides an ergonomic async/await programming model for building durable, long-running workflows. Define orchestrators as `Workflow<TInput, TOutput>` subclasses and activities as `WorkflowActivity<TInput, TOutput>` subclasses, register them in `AddDaprWorkflow`, and schedule instances with `DaprWorkflowClient`. Key patterns covered are: sequential steps with per-activity retry policies, fan-out/fan-in for parallel inventory checks using `Task.WhenAll`, and conditional branching based on activity results. The Dapr runtime handles checkpointing, so the workflow resumes correctly even after a process restart mid-execution.
