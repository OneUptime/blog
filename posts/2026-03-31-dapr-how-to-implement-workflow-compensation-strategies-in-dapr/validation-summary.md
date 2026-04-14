# Validation Summary: How to Implement Workflow Compensation Strategies in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow SDK for .NET (`Dapr.Workflow` NuGet package)
- .NET (C# with top-level statements, records)
- Saga pattern / compensation strategies for distributed transactions
- Redis state store as Dapr actor state store
- Dapr CLI (`dapr run`)

## Sources Consulted
- Dapr .NET SDK source code on GitHub: https://github.com/dapr/dotnet-sdk (WorkflowContext, WorkflowState, DaprWorkflowClient, WorkflowActivity classes)
- Dapr Workflow documentation: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/
- Dapr .NET SDK Workflow docs: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-workflow/
- Dapr Workflow architecture: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-architecture/
- Dapr Workflow quickstart: https://v1-11.docs.dapr.io/getting-started/quickstarts/workflow-quickstart/

## Issues Found

### 1. `SerializedCustomStatus` is not a public property on `WorkflowState`
- **What was wrong:** The polling loop used `state.SerializedCustomStatus` to print the workflow's custom status. This property is internal to the SDK and not part of the public API.
- **What was changed:** Replaced `state.SerializedCustomStatus` with `state?.ReadCustomStatusAs<string>()`, which is the correct public API for reading custom status.

### 2. Host not started before scheduling workflow
- **What was wrong:** The code called `host.Build()`, then immediately used `DaprWorkflowClient` to schedule and poll a workflow, with `host.RunAsync()` only called at the end. The workflow engine runs as part of the host, so workflows cannot be processed until the host is started. This would cause the polling loop to hang indefinitely.
- **What was changed:** Replaced `host.Build()` + `host.RunAsync()` pattern with `host.StartAsync()` before scheduling the workflow, and `host.StopAsync()` after completion. This ensures the workflow engine is running when the workflow is scheduled.

### 3. Missing null safety on `GetWorkflowStateAsync` return value
- **What was wrong:** `GetWorkflowStateAsync` returns `WorkflowState?` (nullable), but the code accessed properties without null checks.
- **What was changed:** Added null-conditional operators (`state?.RuntimeStatus`, `state?.IsWorkflowCompleted == true`, `state?.ReadCustomStatusAs<string>()`) to handle the case where the workflow state is not yet available.

## Review Notes
- The state store component is named `workflowstatestore` in the post. While this works (Dapr identifies the actor state store by the `actorStateStore: "true"` metadata flag, not by name), the conventional name used in Dapr documentation and examples is `statestore`. This is not incorrect but differs from standard conventions.
- The compensation pattern using `Stack<Func<Task>>` with lambdas capturing the `WorkflowContext` is sound. During workflow replay, previously completed `CallActivityAsync` calls return cached results immediately, rebuilding the Stack correctly before the failure point is reached again.
- The `CreateShipmentActivity` uses `new Random()` inside the activity, which is acceptable since activities (unlike orchestrators) do not need to be deterministic.
- `ScheduleNewWorkflowAsync` returns `Task<string>` (the instance ID), but the return value is discarded in the post. This is fine since the instance ID is already known.
