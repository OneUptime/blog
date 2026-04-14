# How to Use Dapr Workflow with External Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, External Event, Orchestration, Microservice

Description: Learn how to use Dapr Workflow external events to pause workflow execution and wait for asynchronous signals like human approvals or payment confirmations.

---

## What Are External Events in Dapr Workflow

External events allow a running Dapr workflow to pause at a specific point and wait for a signal from outside the workflow - such as a user clicking "approve," a payment processor confirming a transaction, or a scheduled timeout expiring. This enables long-running, event-driven workflows without polling or complex state machines.

## Prerequisites

- Dapr CLI installed and initialized
- Dapr Workflow SDK for your language (.NET, Python, Java)
- Basic familiarity with Dapr Workflow concepts

## Define a Workflow That Waits for an External Event (.NET)

```csharp
using Dapr.Workflow;
using System.Threading.Tasks;

public class ApprovalWorkflow : Workflow<OrderRequest, OrderResult>
{
    public override async Task<OrderResult> RunAsync(WorkflowContext context, OrderRequest input)
    {
        Console.WriteLine($"[{context.InstanceId}] Order workflow started for {input.OrderId}");

        // Step 1: validate the order
        bool isValid = await context.CallActivityAsync<bool>(
            nameof(ValidateOrderActivity), input);

        if (!isValid)
        {
            return new OrderResult("Rejected", "Validation failed");
        }

        // Step 2: wait for human approval (up to 24 hours)
        Console.WriteLine($"[{context.InstanceId}] Waiting for approval...");

        ApprovalDecision approvalEvent;
        try
        {
            approvalEvent = await context.WaitForExternalEventAsync<ApprovalDecision>(
                eventName: "approval-decision",
                timeout: TimeSpan.FromHours(24)
            );
        }
        catch (TaskCanceledException)
        {
            return new OrderResult("Rejected", "Timed out waiting for approval");
        }

        if (!approvalEvent.Approved)
        {
            return new OrderResult("Rejected", approvalEvent.Reason);
        }

        Console.WriteLine($"[{context.InstanceId}] Approved by {approvalEvent.ApprovedBy}");

        // Step 3: process the approved order
        await context.CallActivityAsync(nameof(ProcessOrderActivity), input);

        return new OrderResult("Completed", "Order processed successfully");
    }
}

public record ApprovalDecision(bool Approved, string ApprovedBy, string Reason);
```

## Define a Workflow That Waits for Multiple Events (.NET)

```csharp
public class PaymentWorkflow : Workflow<PaymentRequest, PaymentResult>
{
    public override async Task<PaymentResult> RunAsync(WorkflowContext context, PaymentRequest input)
    {
        // Kick off payment initiation
        var paymentRef = await context.CallActivityAsync<string>(
            nameof(InitiatePaymentActivity), input);

        // Wait for EITHER a success confirmation OR a failure event
        var successTask = context.WaitForExternalEventAsync<PaymentConfirmation>("payment-succeeded");
        var failureTask = context.WaitForExternalEventAsync<PaymentFailure>("payment-failed");
        var timeoutTask = context.CreateTimer(TimeSpan.FromMinutes(15));

        var winner = await Task.WhenAny(successTask, failureTask, timeoutTask);

        if (winner == successTask)
        {
            var confirmation = await successTask;
            return new PaymentResult(true, confirmation.TransactionId);
        }
        else if (winner == failureTask)
        {
            var failure = await failureTask;
            return new PaymentResult(false, null, failure.ErrorCode);
        }
        else
        {
            return new PaymentResult(false, null, "TIMEOUT");
        }
    }
}
```

## Start the Workflow

```bash
curl -X POST \
  http://localhost:3500/v1.0/workflows/dapr/ApprovalWorkflow/start?instanceID=order-wf-001 \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-001",
    "customerId": "cust-123",
    "amount": 500.00
  }'
```

## Send an External Event to a Running Workflow

When the human approver clicks "Approve" in your admin panel:

```bash
curl -X POST \
  http://localhost:3500/v1.0/workflows/dapr/order-wf-001/raiseEvent/approval-decision \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "approvedBy": "manager@example.com",
    "reason": "Verified customer, authorized amount"
  }'
```

For rejection:

```bash
curl -X POST \
  http://localhost:3500/v1.0/workflows/dapr/order-wf-001/raiseEvent/approval-decision \
  -H "Content-Type: application/json" \
  -d '{
    "approved": false,
    "approvedBy": "manager@example.com",
    "reason": "Exceeds daily limit"
  }'
```

## Send Events via the .NET SDK

```csharp
using Dapr.Client;

var daprClient = new DaprClientBuilder().Build();

// Send approval from an admin API endpoint
app.MapPost("/admin/orders/{instanceId}/approve", async (string instanceId, ApprovalRequest req) =>
{
    await daprClient.RaiseWorkflowEventAsync(
        instanceId: instanceId,
        workflowComponent: "dapr",
        eventName: "approval-decision",
        eventData: new ApprovalDecision(
            Approved: req.Approved,
            ApprovedBy: req.ApproverEmail,
            Reason: req.Reason
        )
    );
    return Results.Ok(new { message = "Decision submitted" });
});
```

## Check Workflow Status

```bash
curl http://localhost:3500/v1.0/workflows/dapr/order-wf-001
```

Response:

```json
{
  "instanceID": "order-wf-001",
  "runtimeStatus": "RUNNING",
  "createdAt": "2026-03-31T10:00:00Z",
  "lastUpdatedAt": "2026-03-31T10:05:00Z",
  "properties": {}
}
```

## Summary

Dapr Workflow external events enable long-running, event-driven workflows that pause execution and wait for asynchronous signals from outside the workflow process. By calling `WaitForExternalEventAsync` in your workflow definition and sending events via the Dapr API, you can implement human approval flows, payment confirmations, and multi-step async orchestration with built-in timeout and cancellation support.
