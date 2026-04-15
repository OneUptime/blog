# How to Implement Event-Driven Workflow with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Event-Driven, Pub/Sub, Orchestration

Description: Learn how to build event-driven workflows with Dapr that pause execution waiting for external events and resume automatically when those events arrive.

---

## Event-Driven Workflows Explained

An event-driven workflow pauses at certain points and waits for an external signal before continuing. This is different from a purely linear workflow. Use cases include human approval gates, third-party webhook callbacks, and IoT sensor triggers.

Dapr Workflow supports this through `WaitForExternalEventAsync`, which suspends the workflow durably. The workflow state is persisted while it waits, so no resources are consumed.

## Building an Approval Workflow

```csharp
public class ExpenseApprovalWorkflow : Workflow<ExpenseRequest, ApprovalResult>
{
    public override async Task<ApprovalResult> RunAsync(
        WorkflowContext context, ExpenseRequest request)
    {
        // Step 1: Submit for approval
        await context.CallActivityAsync(
            nameof(SubmitForApprovalActivity), request);

        // Step 2: Wait for manager decision (up to 72 hours)
        ApprovalEvent approvalEvent;
        try
        {
            approvalEvent = await context.WaitForExternalEventAsync<ApprovalEvent>(
                eventName: "ManagerDecision",
                timeout: TimeSpan.FromHours(72));
        }
        catch (TaskCanceledException)
        {
            // Timeout - escalate to director
            await context.CallActivityAsync(
                nameof(EscalateToDirectorActivity), request);

            approvalEvent = await context.WaitForExternalEventAsync<ApprovalEvent>(
                eventName: "DirectorDecision",
                timeout: TimeSpan.FromHours(24));
        }

        // Step 3: Process the decision
        if (approvalEvent.Approved)
        {
            await context.CallActivityAsync(
                nameof(ProcessPaymentActivity), request);
        }
        else
        {
            await context.CallActivityAsync(
                nameof(NotifyRejectionActivity), request);
        }

        return new ApprovalResult { Approved = approvalEvent.Approved };
    }
}
```

## Sending the External Event

From the approver's API endpoint, raise the event against the running workflow instance:

```csharp
[HttpPost("approve/{instanceId}")]
public async Task<IActionResult> Approve(
    string instanceId, [FromBody] ApprovalDecision decision)
{
    await _workflowClient.RaiseEventAsync(
        instanceId: instanceId,
        eventName: "ManagerDecision",
        eventPayload: new ApprovalEvent
        {
            Approved = decision.Approved,
            Comment  = decision.Comment,
            ReviewedBy = decision.ManagerId
        });

    return Ok();
}
```

## Waiting for Multiple Events

A workflow can wait for one of several competing events using `Task.WhenAny`:

```csharp
var approvalTask = context.WaitForExternalEventAsync<ApprovalEvent>("ManagerDecision");
var cancelTask   = context.WaitForExternalEventAsync<CancelEvent>("RequestCancelled");

var winner = await Task.WhenAny(approvalTask, cancelTask);

if (winner == cancelTask)
{
    await context.CallActivityAsync(
        nameof(CancelRequestActivity), request.RequestId);
    return new ApprovalResult { Status = "Cancelled" };
}

var approvalEvent = await approvalTask;
```

## Starting the Workflow via Pub/Sub

You can trigger workflow creation from a Dapr pub/sub message subscription:

```csharp
[Topic("pubsub", "expense-requests")]
[HttpPost("start-approval")]
public async Task<IActionResult> StartApproval([FromBody] ExpenseRequest request)
{
    var instanceId = $"expense-{request.ExpenseId}";

    await _workflowClient.ScheduleNewWorkflowAsync(
        name: nameof(ExpenseApprovalWorkflow),
        instanceId: instanceId,
        input: request);

    return Accepted(new { instanceId });
}
```

## Summary

Dapr Workflow's `WaitForExternalEventAsync` makes building event-driven processes straightforward by suspending execution durably until an external event arrives. Timeouts allow escalation paths when no event arrives in time. Events are raised via `DaprWorkflowClient`, and workflows can wait for multiple competing events using `Task.WhenAny` for complex approval flows.
