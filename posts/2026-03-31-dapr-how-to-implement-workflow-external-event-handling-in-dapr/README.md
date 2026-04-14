# How to Implement Workflow External Event Handling in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, External Event, Human-in-the-Loop, Async, Microservice

Description: Learn how to pause Dapr Workflows and resume them based on external events like user approvals, payment confirmations, or third-party webhooks.

---

Many real-world workflows need to pause and wait for something external to happen - a manager approves an expense report, a payment provider sends a webhook, or a third-party system confirms an integration. Dapr Workflow supports this with external event handling: an orchestrator can yield at any point and wait for a named event to arrive before resuming, while the Dapr runtime persists the waiting state so no resources are wasted.

## How External Events Work in Dapr Workflow

When an orchestrator calls `WaitForExternalEventAsync`, the workflow instance is checkpointed to durable state and the orchestrator function suspends. The instance can wait for hours or days. When another service sends an event via the Dapr HTTP API, the runtime wakes the orchestrator and delivers the event payload as the return value.

```text
Orchestrator                     External System
    |                                  |
    |--- activity: ProcessOrder ------>|
    |<-- result                        |
    |                                  |
    |--- WaitForExternalEvent          |
    |    (suspended, waiting)          |
    |                                  |
    |         POST /raiseEvent --------|
    |<-- event payload                 |
    |                                  |
    |--- activity: FinalizeOrder ----->|
```

## Setting Up the Project

```bash
dotnet new web -n ApprovalWorkflow
cd ApprovalWorkflow
dotnet add package Dapr.Workflow
```

## Implementing the Orchestrator with Event Waiting

```csharp
// Models.cs
public record ExpenseReport(string ReportId, string EmployeeId, decimal Amount, string Description);
public record ApprovalDecision(string Decision, string ApproverId, string? Reason);

// Workflows/ExpenseApprovalWorkflow.cs
using Dapr.Workflow;

public class ExpenseApprovalWorkflow : Workflow<ExpenseReport, string>
{
    public override async Task<string> RunAsync(WorkflowContext context, ExpenseReport report)
    {
        // Step 1: Validate and route for approval
        await context.CallActivityAsync<bool>("ValidateExpense", report);
        await context.CallActivityAsync<bool>("NotifyApprover", report);

        context.SetCustomStatus("Waiting for manager approval...");

        // Step 2: Wait for external approval event (up to 72 hours)
        ApprovalDecision decision;
        try
        {
            decision = await context.WaitForExternalEventAsync<ApprovalDecision>(
                eventName: "ApprovalDecision",
                timeout: TimeSpan.FromHours(72));
        }
        catch (TaskCanceledException)
        {
            // Timeout occurred - escalate
            await context.CallActivityAsync<bool>("EscalateExpense", report);
            return $"Expense {report.ReportId} escalated due to no approval within 72 hours";
        }

        context.SetCustomStatus($"Decision received: {decision.Decision}");

        // Step 3: Process based on decision
        if (decision.Decision.Equals("approved", StringComparison.OrdinalIgnoreCase))
        {
            await context.CallActivityAsync<bool>("ProcessPayment", 
                new { Report = report, Decision = decision });
            await context.CallActivityAsync<bool>("NotifyEmployee", 
                new { Report = report, Status = "approved" });
            return $"Expense {report.ReportId} approved and payment processed";
        }
        else
        {
            await context.CallActivityAsync<bool>("NotifyEmployee", 
                new { Report = report, Status = "rejected", Reason = decision.Reason });
            return $"Expense {report.ReportId} rejected: {decision.Reason}";
        }
    }
}
```

## Implementing the Activities

```csharp
// Activities/ExpenseActivities.cs
using Dapr.Workflow;

public class ValidateExpenseActivity : WorkflowActivity<ExpenseReport, bool>
{
    public override async Task<bool> RunAsync(WorkflowActivityContext context, ExpenseReport report)
    {
        Console.WriteLine($"Validating expense {report.ReportId}: ${report.Amount}");
        if (report.Amount <= 0) throw new ArgumentException("Amount must be positive");
        await Task.Delay(100);
        return true;
    }
}

public class NotifyApproverActivity : WorkflowActivity<ExpenseReport, bool>
{
    public override async Task<bool> RunAsync(WorkflowActivityContext context, ExpenseReport report)
    {
        Console.WriteLine($"Sending approval request to manager for {report.ReportId}");
        // In production: send email, Slack message, etc.
        await Task.Delay(200);
        return true;
    }
}

public class ProcessPaymentActivity : WorkflowActivity<object, bool>
{
    public override async Task<bool> RunAsync(WorkflowActivityContext context, object input)
    {
        Console.WriteLine("Processing payment...");
        await Task.Delay(300);
        return true;
    }
}

public class NotifyEmployeeActivity : WorkflowActivity<object, bool>
{
    public override async Task<bool> RunAsync(WorkflowActivityContext context, object input)
    {
        Console.WriteLine("Notifying employee of decision...");
        await Task.Delay(100);
        return true;
    }
}

public class EscalateExpenseActivity : WorkflowActivity<ExpenseReport, bool>
{
    public override async Task<bool> RunAsync(WorkflowActivityContext context, ExpenseReport report)
    {
        Console.WriteLine($"Escalating expense {report.ReportId} to director");
        await Task.Delay(100);
        return true;
    }
}
```

## Registering Workflows and Building the API

```csharp
// Program.cs
using Dapr.Workflow;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprWorkflow(options =>
{
    options.RegisterWorkflow<ExpenseApprovalWorkflow>();
    options.RegisterActivity<ValidateExpenseActivity>();
    options.RegisterActivity<NotifyApproverActivity>();
    options.RegisterActivity<ProcessPaymentActivity>();
    options.RegisterActivity<NotifyEmployeeActivity>();
    options.RegisterActivity<EscalateExpenseActivity>();
});

var app = builder.Build();

// Start a new expense approval workflow
app.MapPost("/expenses", async (ExpenseReport report, DaprWorkflowClient client) =>
{
    await client.ScheduleNewWorkflowAsync(
        name: nameof(ExpenseApprovalWorkflow),
        instanceId: report.ReportId,
        input: report);
    return Results.Accepted($"/expenses/{report.ReportId}", new { instanceId = report.ReportId });
});

// Get workflow status
app.MapGet("/expenses/{reportId}", async (string reportId, DaprWorkflowClient client) =>
{
    var state = await client.GetWorkflowStateAsync(reportId, getInputsAndOutputs: true);
    return Results.Ok(new
    {
        InstanceId = reportId,
        Status = state.RuntimeStatus.ToString(),
        CustomStatus = state.ReadCustomStatusAs<string>()
    });
});

app.Run();
```

## Sending External Events to Resume the Workflow

Once the workflow is waiting, any service can raise the event via the Dapr HTTP API:

```bash
# Approve the expense
curl -X POST \
  "http://localhost:3500/v1.0/workflows/dapr/expense-1234/raiseEvent/ApprovalDecision" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "approved",
    "approverId": "manager-007",
    "reason": null
  }'

# Reject the expense
curl -X POST \
  "http://localhost:3500/v1.0/workflows/dapr/expense-1234/raiseEvent/ApprovalDecision" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "rejected",
    "approverId": "manager-007",
    "reason": "Missing receipts for two line items"
  }'
```

You can also use the Dapr SDK from another service:

```csharp
// ApproverService.cs - called when manager clicks Approve in the web UI
public async Task ApproveExpenseAsync(string reportId, string approverId)
{
    var decision = new ApprovalDecision("approved", approverId, null);
    
    await _daprClient.RaiseWorkflowEventAsync(
        instanceId: reportId,
        workflowComponent: "dapr",
        eventName: "ApprovalDecision",
        eventData: decision);
}
```

## Handling Multiple Competing Events

Sometimes a workflow needs to wait for one of several possible events:

```csharp
// Wait for either approval, rejection, or cancellation
var approvalTask = context.WaitForExternalEventAsync<ApprovalDecision>("ApprovalDecision");
var cancellationTask = context.WaitForExternalEventAsync<string>("CancelRequest");

var winner = await Task.WhenAny(approvalTask, cancellationTask);

if (winner == cancellationTask)
{
    await context.CallActivityAsync<bool>("CancelExpense", report);
    return $"Expense {report.ReportId} cancelled";
}

var decision = await approvalTask;
// process decision...
```

## Summary

Dapr Workflow's external event handling enables human-in-the-loop and third-party integration patterns without polling or complex state machines. The orchestrator suspends at `WaitForExternalEventAsync`, Dapr persists the checkpoint durably, and any service can resume the workflow by calling the `raiseEvent` HTTP endpoint with the event name and payload. Use timeouts to handle cases where events never arrive, and use `Task.WhenAny` for workflows that accept multiple competing event types.
