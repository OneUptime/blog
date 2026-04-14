# Validation Summary: How to Use Dapr Workflow with Sub-Orchestrations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (sub-orchestrations / child workflows)
- Dapr .NET SDK (Dapr.Workflow NuGet package)
- Dapr Python SDK (dapr-ext-workflow)
- Durable Task Framework (underlying engine for Dapr Workflow)
- Dapr Workflow HTTP management API

## Sources Consulted
- Dapr .NET SDK source — WorkflowContext.cs: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Workflow.Abstractions/WorkflowContext.cs
- Dapr .NET SDK source — WorkflowRetryPolicy.cs: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Workflow.Abstractions/WorkflowRetryPolicy.cs
- Dapr .NET SDK source — WorkflowTaskOptions.cs: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Workflow.Abstractions/WorkflowTaskOptions.cs
- Dapr .NET SDK source — WorkflowTaskFailedException.cs: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Workflow.Abstractions/Exceptions/WorkflowTaskFailedException.cs
- Dapr .NET SDK source — WorkflowTaskFailureDetails.cs: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Workflow.Abstractions/WorkflowTaskFailureDetails.cs
- Dapr Workflow features and concepts documentation: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-features-concepts/

## Issues Found

1. **`Guid.NewGuid()` breaks workflow determinism** — In the `FulfillmentWorkflow` code example, `Guid.NewGuid().ToString()` was used to generate a tracking number. Workflow orchestrator code must be deterministic because the framework replays the workflow on recovery. Using `Guid.NewGuid()` produces a different value on each replay. Changed to `context.NewGuid().ToString()`, which uses the deterministic UUID V5 method provided by `WorkflowContext`.

2. **`WorkflowRetryPolicy` missing required `firstRetryInterval` parameter** — The constructor for `WorkflowRetryPolicy` requires both `maxNumberOfAttempts` (int) and `firstRetryInterval` (TimeSpan) as mandatory parameters. The blog only passed `maxNumberOfAttempts: 3`, which would not compile. Added `firstRetryInterval: TimeSpan.FromSeconds(5)` to make it valid.

3. **`FailureDetails.Message` does not exist** — In the error propagation example, `ex.FailureDetails.Message` was used, but `WorkflowTaskFailureDetails` exposes `ErrorMessage`, not `Message`. Changed to `ex.FailureDetails.ErrorMessage`.

## Review Notes
- The Python SDK example correctly uses generator-based workflow syntax with `yield ctx.call_child_workflow(...)`.
- The `ChildWorkflowTaskOptions` record class name and its `InstanceId` property are correct per the current SDK.
- The `WorkflowTaskFailedException` exception type is correct — it is the Dapr SDK's own wrapper, distinct from the Durable Task Framework's `TaskFailedException`.
- The Dapr workflow management API URL format (`/v1.0/workflows/dapr/{instanceId}`) is correct for Dapr 1.13+.
- All workflow and activity registration code using `AddDaprWorkflow` is correct.
