# How to Test Dapr Workflow Orchestrations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Testing, Unit Test, Orchestration

Description: Learn how to unit and integration test Dapr Workflow orchestrations by mocking activity calls and verifying workflow behavior against controlled activity outputs.

---

## Testing Workflows at Two Levels

Workflow testing has two valuable levels:
1. **Unit tests**: Mock activity calls and verify the workflow makes the right decisions based on activity results.
2. **Integration tests**: Run the workflow with real activities against in-memory components to verify the full execution path.

## Workflow Under Test

```csharp
public class OrderFulfillmentWorkflow : Workflow<OrderInput, FulfillmentResult>
{
    public override async Task<FulfillmentResult> RunAsync(
        WorkflowContext context, OrderInput input)
    {
        var inventoryOk = await context.CallActivityAsync<bool>(
            nameof(CheckInventoryActivity), input.Items);

        if (!inventoryOk)
        {
            await context.CallActivityAsync(
                nameof(NotifyOutOfStockActivity), input.CustomerId);
            return new FulfillmentResult { Status = "OutOfStock" };
        }

        var paymentId = await context.CallActivityAsync<string>(
            nameof(ProcessPaymentActivity), input.PaymentToken);

        if (paymentId == null)
            return new FulfillmentResult { Status = "PaymentFailed" };

        var shipmentId = await context.CallActivityAsync<string>(
            nameof(CreateShipmentActivity), input);

        await context.CallActivityAsync(
            nameof(SendConfirmationActivity),
            new ConfirmationData(input.CustomerId, shipmentId));

        return new FulfillmentResult
        {
            Status     = "Completed",
            PaymentId  = paymentId,
            ShipmentId = shipmentId
        };
    }
}
```

## Unit Tests with WorkflowContext Mock

```csharp
// OrderFulfillmentWorkflowTests.cs
public class OrderFulfillmentWorkflowTests
{
    private readonly Mock<WorkflowContext> _mockContext;
    private readonly OrderFulfillmentWorkflow _workflow;
    private readonly OrderInput _input;

    public OrderFulfillmentWorkflowTests()
    {
        _mockContext = new Mock<WorkflowContext>();
        _workflow    = new OrderFulfillmentWorkflow();
        _input       = new OrderInput
        {
            CustomerId   = "cust-1",
            PaymentToken = "tok_test",
            Items        = new List<OrderItem> { new() { ProductId = "sku-1", Qty = 2 } }
        };
    }

    [Fact]
    public async Task RunAsync_ReturnsOutOfStockWhenInventoryFails()
    {
        _mockContext
            .Setup(c => c.CallActivityAsync<bool>(
                nameof(CheckInventoryActivity), _input.Items, null))
            .ReturnsAsync(false);

        _mockContext
            .Setup(c => c.CallActivityAsync(
                nameof(NotifyOutOfStockActivity), _input.CustomerId, null))
            .Returns(Task.FromResult<object?>(null));

        var result = await _workflow.RunAsync(_mockContext.Object, _input);

        Assert.Equal("OutOfStock", result.Status);
        _mockContext.Verify(c => c.CallActivityAsync(
            nameof(NotifyOutOfStockActivity),
            _input.CustomerId, null), Times.Once);
    }

    [Fact]
    public async Task RunAsync_ReturnsCompletedOnHappyPath()
    {
        _mockContext
            .Setup(c => c.CallActivityAsync<bool>(
                nameof(CheckInventoryActivity), It.IsAny<object>(), null))
            .ReturnsAsync(true);

        _mockContext
            .Setup(c => c.CallActivityAsync<string>(
                nameof(ProcessPaymentActivity), _input.PaymentToken, null))
            .ReturnsAsync("pay-001");

        _mockContext
            .Setup(c => c.CallActivityAsync<string>(
                nameof(CreateShipmentActivity), _input, null))
            .ReturnsAsync("ship-001");

        _mockContext
            .Setup(c => c.CallActivityAsync(
                nameof(SendConfirmationActivity), It.IsAny<ConfirmationData>(), null))
            .Returns(Task.FromResult<object?>(null));

        var result = await _workflow.RunAsync(_mockContext.Object, _input);

        Assert.Equal("Completed", result.Status);
        Assert.Equal("pay-001", result.PaymentId);
        Assert.Equal("ship-001", result.ShipmentId);
    }
}
```

## Integration Testing with Real Workflow Runtime

```bash
# Start the service with Dapr - use in-memory components
dapr run \
  --app-id order-service \
  --app-port 5000 \
  --dapr-http-port 3500 \
  --components-path ./components/test \
  -- dotnet run
```

```csharp
[Fact]
[Trait("Category", "Integration")]
public async Task Workflow_CompletesOnHappyPath()
{
    var instanceId = $"test-workflow-{Guid.NewGuid()}";

    await _workflowClient.ScheduleNewWorkflowAsync(
        nameof(OrderFulfillmentWorkflow),
        instanceId,
        input: new OrderInput { CustomerId = "cust-1", PaymentToken = "tok_ok" });

    // Poll until complete
    WorkflowState? state = null;
    for (int i = 0; i < 20; i++)
    {
        state = await _workflowClient.GetWorkflowStateAsync(
            instanceId, getInputsAndOutputs: true);

        if (state?.RuntimeStatus is
            WorkflowRuntimeStatus.Completed or WorkflowRuntimeStatus.Failed)
            break;

        await Task.Delay(500);
    }

    Assert.Equal(WorkflowRuntimeStatus.Completed, state?.RuntimeStatus);
    var result = state!.ReadOutputAs<FulfillmentResult>();
    Assert.Equal("Completed", result.Status);
}
```

## Summary

Unit test Dapr Workflows by mocking `WorkflowContext` to control what each `CallActivityAsync` returns, then assert on the workflow's return value and which activities were called. Integration tests start the service with real Dapr and in-memory components, then poll the workflow status API until completion. Together these two levels provide fast feedback and realistic validation.
