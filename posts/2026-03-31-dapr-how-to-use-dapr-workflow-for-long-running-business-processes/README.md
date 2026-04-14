# How to Use Dapr Workflow for Long-Running Business Processes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Long-Running Processes, Orchestration, Microservice

Description: Learn how to implement long-running business processes like loan approvals or order fulfillment using Dapr Workflow with timers, external events, and durability.

---

## What Makes Dapr Workflow Suitable for Long-Running Processes

Dapr Workflow is designed for processes that span minutes, hours, or even days. It provides:
- Durable state that survives restarts and failures
- External events to pause and await human or system input
- Timers for deadline enforcement
- Replayed execution for crash recovery
- Status querying at any point

This makes it ideal for loan approvals, insurance claims, order fulfillment, onboarding flows, and compliance workflows.

## Example - Loan Application Process

A loan approval involves multiple steps over days: application submission, credit check, underwriter review, and final decision.

## Define the Loan Workflow (.NET)

```csharp
using Dapr.Workflow;

public class LoanApplicationWorkflow : Workflow<LoanApplication, LoanDecision>
{
    public override async Task<LoanDecision> RunAsync(WorkflowContext context, LoanApplication app)
    {
        context.SetCustomStatus("Application received");
        Console.WriteLine($"[{context.InstanceId}] Processing loan for {app.ApplicantName}");

        // Step 1: automated credit check (fast, seconds)
        var creditScore = await context.CallActivityAsync<int>(
            nameof(RunCreditCheckActivity), app);

        if (creditScore < 600)
        {
            context.SetCustomStatus("Rejected - Low credit score");
            return new LoanDecision(false, "Credit score below minimum threshold", null);
        }

        context.SetCustomStatus("Credit check passed, awaiting underwriter review");

        // Step 2: notify underwriter and wait (could be days)
        await context.CallActivityAsync(nameof(NotifyUnderwriterActivity), new
        {
            InstanceId = context.InstanceId,
            Application = app,
            CreditScore = creditScore
        });

        // Wait up to 3 business days for underwriter decision
        UnderwriterDecision? underwriterDecision = null;
        try
        {
            underwriterDecision = await context.WaitForExternalEventAsync<UnderwriterDecision>(
                eventName: "underwriter-decision",
                timeout: TimeSpan.FromDays(3));
        }
        catch (TaskCanceledException)
        {
            // Timed out waiting for underwriter
        }

        if (underwriterDecision == null)
        {
            // Timed out - escalate
            context.SetCustomStatus("Escalated - Underwriter did not respond");
            await context.CallActivityAsync(nameof(EscalateApplicationActivity), app);

            // Wait another 2 days for escalation response
            try
            {
                underwriterDecision = await context.WaitForExternalEventAsync<UnderwriterDecision>(
                    "underwriter-decision",
                    TimeSpan.FromDays(2));
            }
            catch (TaskCanceledException)
            {
                // Timed out again
            }

            if (underwriterDecision == null)
            {
                return new LoanDecision(false, "Application expired due to no underwriter response", null);
            }
        }

        if (!underwriterDecision.Approved)
        {
            context.SetCustomStatus("Rejected by underwriter");
            return new LoanDecision(false, underwriterDecision.Reason, null);
        }

        // Step 3: generate and send loan documents
        context.SetCustomStatus("Generating loan documents");
        var documentPackage = await context.CallActivityAsync<DocumentPackage>(
            nameof(GenerateLoanDocumentsActivity), new
            {
                Application = app,
                ApprovedAmount = underwriterDecision.ApprovedAmount,
                InterestRate = underwriterDecision.InterestRate
            });

        // Step 4: wait for applicant signature (up to 7 days)
        context.SetCustomStatus("Awaiting applicant signature");
        await context.CallActivityAsync(nameof(SendDocumentsToApplicantActivity), documentPackage);

        SignatureEvent? signature = null;
        try
        {
            signature = await context.WaitForExternalEventAsync<SignatureEvent>(
                "documents-signed",
                TimeSpan.FromDays(7));
        }
        catch (TaskCanceledException)
        {
            // Timed out waiting for signature
        }

        if (signature == null)
        {
            context.SetCustomStatus("Expired - Documents not signed in time");
            return new LoanDecision(false, "Applicant did not sign documents within 7 days", null);
        }

        // Step 5: finalize the loan
        context.SetCustomStatus("Finalizing loan");
        var loanAccount = await context.CallActivityAsync<LoanAccount>(
            nameof(FinalizeLoanActivity), new { Application = app, Decision = underwriterDecision });

        context.SetCustomStatus("Loan approved and funded");
        return new LoanDecision(true, "Loan approved", loanAccount.AccountNumber);
    }
}
```

## Start the Long-Running Workflow

```bash
curl -X POST \
  "http://localhost:3500/v1.0/workflows/dapr/LoanApplicationWorkflow/start?instanceID=loan-app-001" \
  -H "Content-Type: application/json" \
  -d '{
    "applicantName": "Alice Johnson",
    "amount": 25000,
    "term": 60,
    "income": 85000,
    "ssn": "xxx-xx-1234"
  }'
```

## Send the Underwriter Decision (hours or days later)

```bash
curl -X POST \
  "http://localhost:3500/v1.0/workflows/dapr/loan-app-001/raiseEvent/underwriter-decision" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "approvedAmount": 25000,
    "interestRate": 5.9,
    "reason": "Meets all lending criteria",
    "underwriterId": "uw-042"
  }'
```

## Check Workflow Status Anytime

```bash
curl "http://localhost:3500/v1.0/workflows/dapr/loan-app-001"
```

Response:

```json
{
  "instanceID": "loan-app-001",
  "workflowName": "LoanApplicationWorkflow",
  "runtimeStatus": "RUNNING",
  "customStatus": "Awaiting applicant signature",
  "createdAt": "2026-03-28T09:00:00Z",
  "lastUpdatedAt": "2026-03-30T14:25:00Z"
}
```

## Build a Status Dashboard

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

async function getApplicationStatus(instanceId) {
  const status = await client.workflow.get(instanceId);

  return {
    id: status.instanceID,
    status: status.runtimeStatus,
    currentStep: status.customStatus,
    startedAt: status.createdAt,
    lastUpdated: status.lastUpdatedAt,
    isComplete: ['COMPLETED', 'FAILED', 'TERMINATED'].includes(status.runtimeStatus),
  };
}

// Poll status for an admin dashboard
app.get('/loans/:id/status', async (req, res) => {
  const status = await getApplicationStatus(req.params.id);
  res.json(status);
});
```

## Summary

Dapr Workflow handles long-running business processes by combining durable state, external event waiting, configurable timeouts, and crash recovery. Processes that span days - like loan approvals, compliance reviews, or onboarding flows - are expressed as straightforward sequential code with `await` calls for human and system events, while Dapr's workflow engine manages persistence, replay, and status tracking transparently.
