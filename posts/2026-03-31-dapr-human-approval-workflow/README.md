# How to Implement Human Approval Workflow with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Human Approval, Orchestration, Business Process

Description: Learn how to implement a human-in-the-loop approval workflow using Dapr workflow to pause execution and wait for external human approval before continuing.

---

## What Is a Human Approval Workflow?

Some business processes require a human decision before proceeding - expense approvals, contract reviews, loan decisions. Dapr Workflow provides `WaitForExternalEventAsync`, which pauses the workflow indefinitely until an external signal arrives.

## Configure the Workflow Runtime

```yaml
# Dapr Workflow uses the state store and actors internally
# No additional component required - just enable the workflow feature
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "approval-service"
```

## Define the Approval Workflow

```csharp
// ExpenseApprovalWorkflow.cs
public class ExpenseApprovalWorkflow : Workflow<ExpenseRequest, ApprovalResult>
{
    public override async Task<ApprovalResult> RunAsync(WorkflowContext context, ExpenseRequest request)
    {
        // Step 1: Validate the expense
        var validation = await context.CallActivityAsync<ValidationResult>(
            nameof(ValidateExpenseActivity), request);

        if (!validation.IsValid)
        {
            return new ApprovalResult { Status = "rejected", Reason = validation.Error };
        }

        // Step 2: Notify approver
        await context.CallActivityAsync(
            nameof(NotifyApproverActivity),
            new { request, approverEmail = "manager@company.com" }
        );

        // Step 3: Wait for human approval (timeout after 48 hours)
        ApprovalDecision approval;
        try
        {
            approval = await context.WaitForExternalEventAsync<ApprovalDecision>(
                "approval-decision",
                TimeSpan.FromHours(48)
            );
        }
        catch (TaskCanceledException)
        {
            // Timeout - escalate
            await context.CallActivityAsync(
                nameof(EscalateExpenseActivity), request);
            return new ApprovalResult { Status = "escalated" };
        }

        // Step 4: Process based on decision
        if (approval.Approved)
        {
            await context.CallActivityAsync(
                nameof(ProcessPaymentActivity),
                new { request, approvedBy = approval.ApproverId }
            );
            return new ApprovalResult { Status = "approved", ApprovedBy = approval.ApproverId };
        }

        return new ApprovalResult { Status = "rejected", Reason = approval.Reason };
    }
}
```

## Activities

```csharp
public class NotifyApproverActivity : WorkflowActivity<NotifyRequest, bool>
{
    public override async Task<bool> RunAsync(WorkflowActivityContext context, NotifyRequest input)
    {
        await emailService.Send(input.approverEmail,
            $"Expense approval needed: {input.request.Amount:C} for {input.request.Description}",
            $"Click here to approve: https://app.corp/approvals/{context.InstanceId}");
        return true;
    }
}
```

## Submitting an Expense for Approval

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

app.post('/expenses', async (req, res) => {
  const instanceId = `expense-${req.body.expenseId}`;

  await client.workflow.start('ExpenseApprovalWorkflow', {
    instanceId,
    input: req.body
  });

  res.json({ instanceId, status: 'pending_approval' });
});
```

## Approver Submits Decision

```javascript
// Called when the approver clicks Approve or Reject in the UI
app.post('/approvals/:instanceId', async (req, res) => {
  const { approved, reason, approverId } = req.body;

  // Send the external event to unblock the waiting workflow
  await client.workflow.raiseEvent(req.params.instanceId, 'approval-decision', {
    approved,
    reason,
    approverId,
    decidedAt: new Date().toISOString()
  });

  res.json({ success: true });
});
```

## Checking Workflow Status

```javascript
app.get('/expenses/:instanceId/status', async (req, res) => {
  const status = await client.workflow.get(req.params.instanceId);
  res.json({
    instanceId: status.instanceId,
    status: status.runtimeStatus,
    result: status.properties['dapr.workflow.output']
  });
});
```

## Summary

Dapr Workflow's `WaitForExternalEventAsync` enables human-in-the-loop workflows by persisting workflow state until a human decision arrives. The workflow survives service restarts during the wait period, and a configurable timeout with escalation logic handles cases where approvers are unresponsive.
