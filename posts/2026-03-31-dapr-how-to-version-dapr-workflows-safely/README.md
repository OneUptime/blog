# How to Version Dapr Workflows Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Versioning, Microservice, Best Practice

Description: Learn safe strategies for versioning Dapr workflows to avoid breaking in-flight instances when deploying changes to long-running workflow definitions.

---

## Why Workflow Versioning Matters

Dapr workflows are durable - they persist their state and replay execution history when resuming. If you change the workflow definition (add steps, remove branches, reorder activities) while instances are still running, the replay may diverge from the recorded history and cause runtime errors or incorrect behavior.

Safe versioning is essential for any workflow that runs longer than a deployment cycle.

## The Core Problem: Non-Deterministic Replay

When Dapr resumes a suspended workflow, it replays all past actions from the history log. If you've changed the code path since those actions were recorded, the replay produces different results than the original execution, which can corrupt state or cause crashes.

```text
Original workflow:    Step A -> Step B -> Step C
Modified workflow:    Step A -> Step B -> Step X -> Step C

In-flight instance at Step B when deploy happens:
- Replay runs Step A, Step B (from history) - OK
- Next step should be Step C (from history) but code says Step X - MISMATCH
```

## Strategy 1 - Patch-Based Versioning with IsPatched

The safest approach for incremental changes is to use `IsPatched` to conditionally branch at specific points in the workflow:

```csharp
using Dapr.Workflow;

public class OrderWorkflow : Workflow<OrderRequest, OrderResult>
{
    public override async Task<OrderResult> RunAsync(WorkflowContext context, OrderRequest input)
    {
        await context.CallActivityAsync(nameof(ValidateOrderActivity), input);

        // Patch: add fraud check between validation and processing
        if (context.IsPatched("add-fraud-check"))
        {
            await context.CallActivityAsync(nameof(FraudCheckActivity), input);
        }

        await context.CallActivityAsync(nameof(ProcessOrderActivity), input);

        // Patch: add customer notification after processing
        if (context.IsPatched("add-customer-notification"))
        {
            await context.CallActivityAsync(nameof(NotifyCustomerActivity), input);
        }

        return new OrderResult("Completed", "");
    }
}
```

`IsPatched` records the patch check in the workflow instance history the first time it is evaluated. For new instances, it returns `true`, so they execute the new code path. For in-flight instances replaying from history, it returns `false`, so they follow the original path. Patch identifiers must be unique within a workflow and should never be reused across deployments.

## Strategy 2 - Deploy New Workflow Type for Major Changes

For significant refactors, create a new workflow class rather than modifying the existing one:

```csharp
// Keep old version running for in-flight instances
public class OrderWorkflowV1 : Workflow<OrderRequest, OrderResult>
{
    public override async Task<OrderResult> RunAsync(WorkflowContext context, OrderRequest input)
    {
        // original implementation - do not change
        await context.CallActivityAsync(nameof(ValidateOrderActivity), input);
        await context.CallActivityAsync(nameof(ProcessOrderActivity), input);
        return new OrderResult("Completed", "");
    }
}

// New version for new instances
public class OrderWorkflowV2 : Workflow<OrderRequest, OrderResult>
{
    public override async Task<OrderResult> RunAsync(WorkflowContext context, OrderRequest input)
    {
        await context.CallActivityAsync(nameof(ValidateOrderActivity), input);
        await context.CallActivityAsync(nameof(FraudCheckActivity), input);
        await context.CallActivityAsync(nameof(ProcessOrderActivity), input);
        await context.CallActivityAsync(nameof(NotifyCustomerActivity), input);
        return new OrderResult("Completed", "");
    }
}
```

Route new requests to V2 while V1 instances complete:

```csharp
app.MapPost("/orders", async (OrderRequest req, DaprWorkflowClient workflowClient) =>
{
    var instanceId = await workflowClient.ScheduleNewWorkflowAsync(
        name: nameof(OrderWorkflowV2), // point new orders to v2
        instanceId: $"order-{req.OrderId}",
        input: req
    );
    return Results.Accepted(instanceId);
});
```

## Strategy 3 - Drain and Redeploy

For deployments where no migration path is needed, drain in-flight workflows before deploying:

```bash
# 1. Stop accepting new workflow instances (application-level gate)
# 2. Wait for all running instances to complete
kubectl exec -it dapr-pod -- \
  dapr invoke --app-id my-app --method /admin/workflow-count

# 3. Once count is 0, deploy the new version
kubectl set image deployment/my-app app=my-app:v2

# 4. Re-enable workflow acceptance
```

## Safe Change Types vs. Unsafe Changes

```text
SAFE changes (no versioning needed):
- Adding new activities after the current furthest step
- Changing activity implementation without changing the method name
- Adding new sub-orchestrations at the end

UNSAFE changes (require versioning):
- Adding steps before or between existing steps
- Removing or reordering existing steps
- Changing input/output types of existing activities
- Renaming activities or external event names
```

## Summary

Safe Dapr workflow versioning requires understanding that workflow replay must be deterministic with respect to execution history. The `IsPatched` method provides a first-class mechanism for conditionally branching within a single workflow class, while deploying separate named workflow versions handles major refactors. Always identify in-flight instances before deploying breaking changes to long-running workflows.
