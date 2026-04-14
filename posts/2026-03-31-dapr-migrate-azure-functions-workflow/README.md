# How to Migrate from Azure Functions to Dapr Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Azure Function, Migration, Orchestration

Description: Learn how to migrate Azure Durable Functions orchestrations to Dapr Workflow to gain portability across cloud providers and local development simplicity.

---

## Why Migrate from Azure Durable Functions?

Azure Durable Functions is excellent but vendor-locked to Azure. It requires Azure Storage for state, cannot run locally without the Azure Storage Emulator, and has no path to on-premises or multi-cloud deployment. Dapr Workflow provides the same durable execution model with pluggable state backends that work anywhere.

## Concept Mapping

| Azure Durable Functions | Dapr Workflow |
|------------------------|---------------|
| Orchestrator Function | Workflow class |
| Activity Function | Activity class |
| `context.CallActivityAsync` | `context.CallActivityAsync` |
| `context.WaitForExternalEvent` | `context.WaitForExternalEventAsync` |
| `DurableClient.StartNewAsync` | `daprWorkflowClient.ScheduleNewWorkflowAsync` |
| `DurableClient.GetStatusAsync` | `daprWorkflowClient.GetWorkflowStateAsync` |
| Azure Storage | Redis / Kubernetes Secrets / any Dapr state store |

## Before: Azure Durable Function

```csharp
// Orchestrator
[FunctionName("OrderOrchestrator")]
public static async Task<OrderResult> RunOrchestrator(
    [OrchestrationTrigger] IDurableOrchestrationContext context)
{
    var input = context.GetInput<OrderInput>();

    var inventoryOk = await context.CallActivityAsync<bool>(
        "ReserveInventory", input);

    if (!inventoryOk)
        return new OrderResult { Status = "OutOfStock" };

    var paymentOk = await context.CallActivityAsync<bool>(
        "ProcessPayment", input);

    return new OrderResult { Status = paymentOk ? "Completed" : "Failed" };
}

// Activity
[FunctionName("ReserveInventory")]
public static async Task<bool> ReserveInventory(
    [ActivityTrigger] OrderInput input,
    ILogger log)
{
    log.LogInformation($"Reserving inventory for order {input.OrderId}");
    return await InventoryService.ReserveAsync(input);
}
```

## After: Dapr Workflow

```csharp
// Workflow (orchestrator equivalent)
public class OrderWorkflow : Workflow<OrderInput, OrderResult>
{
    public override async Task<OrderResult> RunAsync(
        WorkflowContext context, OrderInput input)
    {
        var inventoryOk = await context.CallActivityAsync<bool>(
            nameof(ReserveInventoryActivity), input);

        if (!inventoryOk)
            return new OrderResult { Status = "OutOfStock" };

        var paymentOk = await context.CallActivityAsync<bool>(
            nameof(ProcessPaymentActivity), input);

        return new OrderResult { Status = paymentOk ? "Completed" : "Failed" };
    }
}

// Activity (activity function equivalent)
public class ReserveInventoryActivity : WorkflowActivity<OrderInput, bool>
{
    private readonly IInventoryService _inventory;
    private readonly ILogger<ReserveInventoryActivity> _logger;

    public ReserveInventoryActivity(
        IInventoryService inventory,
        ILogger<ReserveInventoryActivity> logger)
    {
        _inventory = inventory;
        _logger = logger;
    }

    public override async Task<bool> RunAsync(
        WorkflowActivityContext context, OrderInput input)
    {
        _logger.LogInformation("Reserving inventory for order {OrderId}", input.OrderId);
        return await _inventory.ReserveAsync(input);
    }
}
```

## Starting the Workflow

Before (Azure Durable):

```csharp
[FunctionName("StartOrder")]
public static async Task<HttpResponseMessage> HttpStart(
    [HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequestMessage req,
    [DurableClient] IDurableOrchestrationClient starter)
{
    var instanceId = await starter.StartNewAsync("OrderOrchestrator", null, input);
    return starter.CreateCheckStatusResponse(req, instanceId);
}
```

After (Dapr Workflow):

```csharp
[HttpPost("orders")]
public async Task<IActionResult> StartOrder([FromBody] OrderInput input)
{
    var instanceId = $"order-{input.OrderId}";
    await _daprWorkflowClient.ScheduleNewWorkflowAsync(
        name: nameof(OrderWorkflow),
        instanceId: instanceId,
        input: input);

    return Accepted(new { instanceId });
}
```

## Running Locally Without Azure

```bash
dapr run \
  --app-id order-service \
  --app-port 5000 \
  --dapr-http-port 3500 \
  --resources-path ./components \
  -- dotnet run
```

No Azure Storage Emulator needed - Dapr uses in-memory or Redis state by default.

## Summary

Migrating from Azure Durable Functions to Dapr Workflow is largely a structural mapping: orchestrators become Workflow classes, activity functions become Activity classes, and the DurableClient calls map directly to Dapr client methods. The key benefit is portability - Dapr Workflow runs on any cloud, on-premises, or locally without external emulators.
