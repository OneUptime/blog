# How to Migrate from AWS Step Functions to Dapr Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, AWS Step Function, Migration, Orchestration

Description: Learn how to migrate AWS Step Functions state machines to Dapr Workflow to remove AWS vendor lock-in and run workflows in any environment.

---

## Why Move Away from Step Functions?

AWS Step Functions is powerful but limited to AWS. State definitions are written in Amazon States Language (ASL) - a JSON/YAML DSL that must be deployed and versioned separately from your application code. Testing locally requires the Step Functions Local emulator. Dapr Workflow lets you write orchestration logic in the same language as your services, runs locally without AWS credentials, and works on any cloud.

## Concept Mapping

| AWS Step Functions | Dapr Workflow |
|-------------------|---------------|
| State Machine (ASL) | Workflow class |
| Task State | Activity class |
| Choice State | `if` / `switch` in workflow |
| Parallel State | `Task.WhenAll` |
| Wait State | `context.CreateTimer` |
| Callback with `waitForTaskToken` | `context.WaitForExternalEventAsync` |
| `StartExecution` API | `daprWorkflowClient.ScheduleNewWorkflowAsync` |

## Before: Step Functions ASL

```json
{
  "Comment": "Order processing state machine",
  "StartAt": "ReserveInventory",
  "States": {
    "ReserveInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123:function:ReserveInventory",
      "Next": "ProcessPayment",
      "Catch": [{"ErrorEquals": ["OutOfStock"], "Next": "HandleOutOfStock"}]
    },
    "ProcessPayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123:function:ProcessPayment",
      "Next": "ShipOrder",
      "Catch": [{"ErrorEquals": ["PaymentFailed"], "Next": "HandlePaymentFailed"}]
    },
    "ShipOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123:function:ShipOrder",
      "Next": "SendConfirmation"
    },
    "SendConfirmation": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123:function:SendConfirmation",
      "End": true
    },
    "HandleOutOfStock": {"Type": "Fail", "Error": "OutOfStock"},
    "HandlePaymentFailed": {"Type": "Fail", "Error": "PaymentFailed"}
  }
}
```

## After: Dapr Workflow

```csharp
public class OrderWorkflow : Workflow<OrderInput, OrderResult>
{
    public override async Task<OrderResult> RunAsync(
        WorkflowContext context, OrderInput input)
    {
        // ReserveInventory state
        bool reserved;
        try
        {
            reserved = await context.CallActivityAsync<bool>(
                nameof(ReserveInventoryActivity), input);
        }
        catch (Exception)
        {
            return new OrderResult { Status = "OutOfStock" };
        }

        if (!reserved)
            return new OrderResult { Status = "OutOfStock" };

        // ProcessPayment state
        bool paid;
        try
        {
            paid = await context.CallActivityAsync<bool>(
                nameof(ProcessPaymentActivity), input);
        }
        catch (Exception)
        {
            return new OrderResult { Status = "PaymentFailed" };
        }

        // ShipOrder state
        var shipmentId = await context.CallActivityAsync<string>(
            nameof(ShipOrderActivity), input);

        // SendConfirmation state
        await context.CallActivityAsync(
            nameof(SendConfirmationActivity),
            new ConfirmationData(input.OrderId, shipmentId));

        return new OrderResult { Status = "Completed", ShipmentId = shipmentId };
    }
}
```

## Parallel State with Task.WhenAll

```csharp
// Step Functions Parallel becomes Task.WhenAll
var notifyTask  = context.CallActivityAsync(nameof(NotifyCustomerActivity), input);
var auditTask   = context.CallActivityAsync(nameof(AuditOrderActivity), input);
var analyticsTask = context.CallActivityAsync(nameof(TrackAnalyticsActivity), input);

await Task.WhenAll(notifyTask, auditTask, analyticsTask);
```

## Wait State Equivalent

```csharp
// Step Functions Wait becomes CreateTimer
await context.CreateTimer(TimeSpan.FromMinutes(30));
```

## Testing Locally

```bash
dapr run \
  --app-id order-service \
  --dapr-http-port 3500 \
  -- dotnet run
```

No AWS credentials or LocalStack needed.

## Summary

Migrating from AWS Step Functions to Dapr Workflow replaces JSON ASL state machine definitions with type-safe, testable code in your preferred language. Choice states become `if` statements, Parallel states become `Task.WhenAll`, and Wait states become `CreateTimer`. The entire workflow runs locally without AWS infrastructure, and deploying to production requires no changes to the orchestration logic.
