# How to Implement Conditional Branching Workflow with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Conditional, Branching, Orchestration

Description: Learn how to implement conditional branching in Dapr Workflow to route execution paths based on activity results and business rules at runtime.

---

## What Is Conditional Branching?

Conditional branching in a workflow means taking different execution paths based on data produced at runtime. Instead of a linear sequence, your workflow forks: one path for approved orders, another for rejected ones, a third for partial fulfillment.

Dapr Workflow is just C# (or Python/Java) code, so branching uses ordinary `if` statements. The durable execution engine replays those branches deterministically using its history log.

## A Simple Approval Workflow

Consider a loan approval process with three possible outcomes: instant approval, manual review, or instant rejection based on credit score.

```csharp
public class LoanApprovalWorkflow : Workflow<LoanRequest, LoanDecision>
{
    public override async Task<LoanDecision> RunAsync(
        WorkflowContext context, LoanRequest request)
    {
        // Step 1: Run credit check
        var creditScore = await context.CallActivityAsync<int>(
            nameof(CheckCreditScoreActivity), request.ApplicantId);

        // Step 2: Branch on score
        if (creditScore >= 750)
        {
            // Auto-approve high-score applicants
            var offer = await context.CallActivityAsync<LoanOffer>(
                nameof(GenerateAutoApprovalOfferActivity), request);

            await context.CallActivityAsync(
                nameof(NotifyApplicantActivity),
                new Notification(request.ApplicantId, "approved", offer));

            return new LoanDecision { Status = "Approved", Offer = offer };
        }
        else if (creditScore >= 600)
        {
            // Send to human review queue
            await context.CallActivityAsync(
                nameof(QueueForManualReviewActivity), request);

            // Wait for reviewer decision (up to 48 hours)
            var reviewResult = await context.WaitForExternalEventAsync<ReviewResult>(
                "ReviewCompleted",
                timeout: TimeSpan.FromHours(48));

            return new LoanDecision
            {
                Status = reviewResult.Approved ? "Approved" : "Rejected",
                Offer = reviewResult.Offer
            };
        }
        else
        {
            // Auto-reject low-score applicants
            await context.CallActivityAsync(
                nameof(NotifyApplicantActivity),
                new Notification(request.ApplicantId, "rejected", null));

            return new LoanDecision { Status = "Rejected" };
        }
    }
}
```

## Branching on Multiple Conditions

You can combine multiple factors before branching:

```csharp
var creditScore = await context.CallActivityAsync<int>(
    nameof(CheckCreditScoreActivity), request.ApplicantId);

var incomeVerified = await context.CallActivityAsync<bool>(
    nameof(VerifyIncomeActivity), request.ApplicantId);

var requestedAmount = request.LoanAmount;

string route = (creditScore, incomeVerified, requestedAmount) switch
{
    ( >= 750, true, <= 50000) => "AutoApprove",
    ( >= 700, true, _)        => "ManualReview",
    ( >= 600, false, _)       => "IncomeVerificationNeeded",
    _                          => "AutoReject"
};

return route switch
{
    "AutoApprove" => await HandleAutoApprove(context, request),
    "ManualReview" => await HandleManualReview(context, request),
    "IncomeVerificationNeeded" => await HandleIncomeVerification(context, request),
    _ => await HandleAutoReject(context, request)
};
```

## Determinism Rule

When writing conditional logic in Dapr Workflow, avoid non-deterministic calls inside the workflow function:

```csharp
// WRONG - DateTime.Now is non-deterministic during replay
if (DateTime.Now.Hour < 12) { ... }

// CORRECT - use context.CurrentUtcDateTime
if (context.CurrentUtcDateTime.Hour < 12) { ... }
```

## Registering the Workflow

```csharp
builder.Services.AddDaprWorkflow(options =>
{
    options.RegisterWorkflow<LoanApprovalWorkflow>();
    options.RegisterActivity<CheckCreditScoreActivity>();
    options.RegisterActivity<GenerateAutoApprovalOfferActivity>();
    options.RegisterActivity<QueueForManualReviewActivity>();
    options.RegisterActivity<NotifyApplicantActivity>();
});
```

## Summary

Dapr Workflow supports conditional branching through plain language constructs like `if`, `switch`, and ternary expressions. The durable execution engine replays history deterministically, so branches always resolve the same way given the same inputs. Always use `context.CurrentUtcDateTime` instead of system clock calls inside workflow code to preserve replay correctness.
